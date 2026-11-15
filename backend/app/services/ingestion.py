import io
import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.database import crud
from app.models.enums import DocumentStatus, SourceType
from app.models.knowledge import KnowledgeDocument
from app.services.vector_store import ChromaVectorStore, get_vector_store

logger = logging.getLogger("meetingmate.ingestion")

# Common allowed file extensions and mime types
SUPPORTED_EXTENSIONS = {".pdf", ".txt"}
SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "application/octet-stream",  # Sometimes sent for plain text or generic binary
}


class DocumentExtractionError(Exception):
    """Raised when document content cannot be parsed or extracted."""
    pass


class IngestionService:
    """
    Handles document ingestion pipeline:
    1. Content extraction (PDF, TXT, Raw text)
    2. Text cleaning and formatting normalization
    3. Paragraph and sentence boundary chunking
    4. Local vector embedding in ChromaDB
    5. Document metadata tracking in SQLite
    """

    def __init__(self, vector_store: Optional[ChromaVectorStore] = None):
        self.vector_store = vector_store or get_vector_store()

    # --------------------------------------------------------------------------
    # EXTRACTION PIPELINE
    # --------------------------------------------------------------------------

    def extract_from_bytes(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> List[Tuple[int, str]]:
        """
        Extracts text content page-by-page from raw bytes based on file extension.
        Returns a list of tuples: (page_number, page_text).
        """
        if not file_bytes:
            raise DocumentExtractionError("File content is completely empty (0 bytes).")

        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            return self.extract_from_pdf(file_bytes)
        elif lower_name.endswith(".txt"):
            text = self.extract_from_txt(file_bytes)
            return [(1, text)]
        else:
            raise DocumentExtractionError(
                f"Unsupported file format '{filename}'. Supported formats: .pdf, .txt"
            )

    def extract_from_pdf(self, file_bytes: bytes) -> List[Tuple[int, str]]:
        """
        Extracts text from PDF bytes page by page.
        """
        try:
            stream = io.BytesIO(file_bytes)
            reader = PdfReader(stream)
        except Exception as e:
            raise DocumentExtractionError(f"Failed to read PDF document structure: {str(e)}")

        if len(reader.pages) == 0:
            raise DocumentExtractionError("PDF contains no pages.")

        pages_content: List[Tuple[int, str]] = []
        total_extracted_chars = 0

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            try:
                page_text = page.extract_text() or ""
                cleaned = self.clean_text(page_text)
                if cleaned:
                    pages_content.append((page_num, cleaned))
                    total_extracted_chars += len(cleaned)
            except Exception as e:
                logger.warning(f"Warning: Failed to extract text from PDF page {page_num}: {e}")

        if total_extracted_chars == 0:
            raise DocumentExtractionError(
                "PDF contains no extractable text. Scanned images or encrypted documents require OCR or decryption."
            )

        return pages_content

    def extract_from_txt(self, file_bytes: bytes) -> str:
        """
        Decodes plain text bytes with fallback encoding mechanisms.
        """
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
        for enc in encodings:
            try:
                text = file_bytes.decode(enc)
                cleaned = self.clean_text(text)
                if cleaned:
                    return cleaned
            except UnicodeDecodeError:
                continue

        raise DocumentExtractionError("Unable to decode text file. Ensure valid UTF-8 encoding.")

    # --------------------------------------------------------------------------
    # CLEANING PIPELINE
    # --------------------------------------------------------------------------

    def clean_text(self, text: str) -> str:
        """
        Cleans unnecessary formatting:
        - Normalizes unicode whitespace (e.g. \u00a0 non-breaking spaces)
        - Removes non-printable control characters
        - Collapses repeated horizontal whitespace
        - Normalizes excessive blank lines
        """
        if not text:
            return ""

        # Normalize special unicode spaces
        text = text.replace("\u00a0", " ").replace("\u200b", "").replace("\ufeff", "")

        # Remove control characters except standard whitespace (\n, \r, \t)
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Standardize line endings
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Collapse horizontal whitespace (spaces, tabs) but preserve line breaks
        text = re.sub(r"[ \t]+", " ", text)

        # Normalize 3 or more consecutive newlines into 2 (clean paragraph break)
        text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)

        # Strip leading and trailing whitespace on each line
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines)

        return text.strip()

    # --------------------------------------------------------------------------
    # CHUNKING PIPELINE
    # --------------------------------------------------------------------------

    def chunk_document_pages(
        self,
        pages: List[Tuple[int, str]],
        document_id: str,
        title: str,
        source_type: str,
        source_url: Optional[str] = None,
        language: str = "ta",
        chunk_size: int = 600,
        chunk_overlap: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Splits page contents into semantically cohesive chunks.
        Preserves page number and paragraph reference information.
        """
        all_chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for page_num, page_text in pages:
            paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]
            if not paragraphs:
                paragraphs = [page_text]

            para_idx = 0
            current_chunk_text = ""
            current_start_para = 1

            for p in paragraphs:
                para_idx += 1

                # If single paragraph is larger than chunk_size, split by sentences/window
                if len(p) > chunk_size:
                    # Flush current accumulator first
                    if current_chunk_text:
                        global_chunk_idx += 1
                        all_chunks.append({
                            "chunk_id": f"{document_id}_c{global_chunk_idx}",
                            "document_id": document_id,
                            "content": current_chunk_text.strip(),
                            "title": title,
                            "source_type": source_type,
                            "source_url": source_url or "",
                            "language": language,
                            "page_number": page_num,
                            "paragraph_reference": f"Page {page_num}, para {current_start_para}-{para_idx - 1}" if current_start_para != (para_idx - 1) else f"Page {page_num}, para {current_start_para}",
                            "chunk_index": global_chunk_idx,
                        })
                        current_chunk_text = ""

                    # Split large paragraph into subchunks
                    subchunks = self._split_large_paragraph(p, chunk_size, chunk_overlap)
                    for sub_idx, sub in enumerate(subchunks, start=1):
                        global_chunk_idx += 1
                        all_chunks.append({
                            "chunk_id": f"{document_id}_c{global_chunk_idx}",
                            "document_id": document_id,
                            "content": sub.strip(),
                            "title": title,
                            "source_type": source_type,
                            "source_url": source_url or "",
                            "language": language,
                            "page_number": page_num,
                            "paragraph_reference": f"Page {page_num}, para {para_idx} (part {sub_idx})",
                            "chunk_index": global_chunk_idx,
                        })
                    current_start_para = para_idx + 1
                    continue

                # Check if appending paragraph exceeds chunk size
                if current_chunk_text and (len(current_chunk_text) + len(p) + 2 > chunk_size):
                    # Flush current accumulator
                    global_chunk_idx += 1
                    para_ref = (
                        f"Page {page_num}, para {current_start_para}-{para_idx - 1}"
                        if current_start_para != (para_idx - 1)
                        else f"Page {page_num}, para {current_start_para}"
                    )
                    all_chunks.append({
                        "chunk_id": f"{document_id}_c{global_chunk_idx}",
                        "document_id": document_id,
                        "content": current_chunk_text.strip(),
                        "title": title,
                        "source_type": source_type,
                        "source_url": source_url or "",
                        "language": language,
                        "page_number": page_num,
                        "paragraph_reference": para_ref,
                        "chunk_index": global_chunk_idx,
                    })

                    # Maintain overlap from tail of previous text if feasible
                    overlap_seed = self._extract_overlap_tail(current_chunk_text, chunk_overlap)
                    current_chunk_text = f"{overlap_seed}\n{p}" if overlap_seed else p
                    current_start_para = para_idx
                else:
                    if current_chunk_text:
                        current_chunk_text += f"\n\n{p}"
                    else:
                        current_chunk_text = p
                        current_start_para = para_idx

            # Flush any remaining text on the page
            if current_chunk_text.strip():
                global_chunk_idx += 1
                para_ref = (
                    f"Page {page_num}, para {current_start_para}-{para_idx}"
                    if current_start_para != para_idx
                    else f"Page {page_num}, para {current_start_para}"
                )
                all_chunks.append({
                    "chunk_id": f"{document_id}_c{global_chunk_idx}",
                    "document_id": document_id,
                    "content": current_chunk_text.strip(),
                    "title": title,
                    "source_type": source_type,
                    "source_url": source_url or "",
                    "language": language,
                    "page_number": page_num,
                    "paragraph_reference": para_ref,
                    "chunk_index": global_chunk_idx,
                })

        return all_chunks

    def _split_large_paragraph(
        self, text: str, chunk_size: int, chunk_overlap: int
    ) -> List[str]:
        """
        Splits a single oversized paragraph along sentence boundaries or sliding window.
        """
        # Sentence splitting pattern (supporting English and Tamil punctuation)
        sentences = re.split(r"(?<=[.!?|।])\s+", text)
        chunks: List[str] = []
        cur = ""

        for s in sentences:
            if not s.strip():
                continue
            if cur and (len(cur) + len(s) + 1 > chunk_size):
                chunks.append(cur)
                overlap = self._extract_overlap_tail(cur, chunk_overlap)
                cur = f"{overlap} {s}" if overlap else s
            else:
                cur = f"{cur} {s}" if cur else s

        if cur.strip():
            chunks.append(cur)

        # Fallback if sentences themselves were larger than chunk_size
        final_chunks: List[str] = []
        for c in chunks:
            if len(c) <= chunk_size * 1.2:
                final_chunks.append(c)
            else:
                # Sliding word window
                words = c.split()
                w_cur: List[str] = []
                w_len = 0
                for w in words:
                    w_cur.append(w)
                    w_len += len(w) + 1
                    if w_len >= chunk_size:
                        final_chunks.append(" ".join(w_cur))
                        # Keep trailing words for overlap
                        overlap_words = w_cur[-max(1, chunk_overlap // 10):]
                        w_cur = list(overlap_words)
                        w_len = sum(len(x) + 1 for x in w_cur)
                if w_cur:
                    final_chunks.append(" ".join(w_cur))

        return final_chunks

    def _extract_overlap_tail(self, text: str, overlap_size: int) -> str:
        """
        Extracts a clean tail slice from text roughly matching overlap_size characters.
        """
        if not text or len(text) <= overlap_size:
            return ""
        tail = text[-overlap_size:]
        # Find first whitespace to prevent cutting a word in half
        first_space = tail.find(" ")
        if first_space != -1:
            return tail[first_space + 1:].strip()
        return tail.strip()

    # --------------------------------------------------------------------------
    # ORCHESTRATION PIPELINE
    # --------------------------------------------------------------------------

    def ingest(
        self,
        db: Session,
        title: str,
        source_type: str,
        source_url: Optional[str] = None,
        language: str = "ta",
        raw_text: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        filename: Optional[str] = None,
        document_id: Optional[str] = None,
    ) -> Tuple[KnowledgeDocument, int]:
        """
        Executes end-to-end ingestion:
        - Detects existing document for re-indexing / duplicate avoidance.
        - Extracts text.
        - Chunks content.
        - Persists embeddings in ChromaDB.
        - Updates SQLite record status.
        """
        # Validate source_type
        clean_source_type = source_type.strip().lower()
        allowed_types = {st.value for st in SourceType}
        if clean_source_type not in allowed_types:
            clean_source_type = SourceType.OTHER.value

        # Check duplicate or existing document
        existing_doc = None
        if document_id:
            existing_doc = crud.get_knowledge_document(db, document_id)
        if not existing_doc:
            existing_doc = crud.find_knowledge_document_by_title_or_url(db, title, source_url)

        if existing_doc:
            doc = existing_doc
            doc.title = title
            doc.source_type = clean_source_type
            doc.source_url = source_url
            doc.language = language
            doc.document_status = DocumentStatus.PENDING.value
            db.commit()
            db.refresh(doc)
            logger.info(f"Re-indexing existing KnowledgeDocument '{doc.title}' ({doc.id})")
        else:
            doc_id = document_id or str(uuid.uuid4())
            doc = KnowledgeDocument(
                id=doc_id,
                title=title,
                source_type=clean_source_type,
                source_url=source_url,
                language=language,
                document_status=DocumentStatus.PENDING.value,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(f"Created new KnowledgeDocument '{doc.title}' ({doc.id})")

        # Extraction phase
        try:
            if file_bytes is not None and filename:
                pages = self.extract_from_bytes(file_bytes, filename)
            elif raw_text:
                cleaned = self.clean_text(raw_text)
                if not cleaned:
                    raise DocumentExtractionError("Provided raw text is empty after cleaning.")
                pages = [(1, cleaned)]
            else:
                raise DocumentExtractionError("No file bytes or text provided for ingestion.")
        except Exception as e:
            doc.document_status = DocumentStatus.FAILED.value
            db.commit()
            logger.error(f"Extraction failed for document {doc.id}: {e}")
            raise

        # Chunking phase
        try:
            chunks = self.chunk_document_pages(
                pages=pages,
                document_id=doc.id,
                title=doc.title,
                source_type=doc.source_type,
                source_url=doc.source_url,
                language=doc.language,
            )
            if not chunks:
                raise DocumentExtractionError("Document generated 0 chunks.")
        except Exception as e:
            doc.document_status = DocumentStatus.FAILED.value
            db.commit()
            logger.error(f"Chunking failed for document {doc.id}: {e}")
            raise

        # Embedding & ChromaDB storage phase
        try:
            # Purge any previous chunks if re-indexing
            self.vector_store.delete_document_chunks(doc.id)

            # Insert chunks into ChromaDB
            chunks_indexed = self.vector_store.add_chunks(chunks)

            # Update status to INDEXED
            doc.document_status = DocumentStatus.INDEXED.value
            db.commit()
            db.refresh(doc)
            logger.info(f"Successfully ingested and indexed document {doc.id} with {chunks_indexed} chunks.")
            return doc, chunks_indexed
        except Exception as e:
            doc.document_status = DocumentStatus.FAILED.value
            db.commit()
            logger.error(f"Vector indexing failed for document {doc.id}: {e}")
            raise


# Singleton ingestion service instance
_ingestion_service_instance: Optional[IngestionService] = None


def get_ingestion_service() -> IngestionService:
    """
    Returns the singleton IngestionService instance.
    """
    global _ingestion_service_instance
    if _ingestion_service_instance is None:
        _ingestion_service_instance = IngestionService()
    return _ingestion_service_instance
