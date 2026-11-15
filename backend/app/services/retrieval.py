import logging
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.database import crud
from app.models.enums import DocumentStatus
from app.schemas.search import SearchResultItem
from app.services.vector_store import ChromaVectorStore, get_vector_store

logger = logging.getLogger("meetingmate.retrieval")


class RetrievalService:
    """
    RAG Retrieval Engine:
    1. Normalizes user query without changing semantic meaning.
    2. Executes semantic similarity search against local ChromaDB embeddings.
    3. Handles multi-attribute metadata filtering (source_type, language, document_id).
    4. Calculates normalized relevance scores from cosine distances.
    5. Deduplicates overlapping and redundant chunk results.
    6. Verifies and enriches source metadata against SQLite.
    7. Strictly returns reference sources without generating answers.
    """

    def __init__(self, vector_store: Optional[ChromaVectorStore] = None):
        self.vector_store = vector_store or get_vector_store()

    # --------------------------------------------------------------------------
    # QUERY NORMALIZATION
    # --------------------------------------------------------------------------

    def normalize_query(self, query: str) -> str:
        """
        Normalizes query text:
        - Removes zero-width and non-breaking spaces
        - Cleans non-printable control characters
        - Collapses whitespace
        - Preserves all Tamil characters, diacritics, and semantic vocabulary
        """
        if not query:
            return ""

        # Normalize unicode spaces and zero-width artifacts
        q = (
            query.replace("\u00a0", " ")
            .replace("\u200b", "")
            .replace("\ufeff", "")
            .replace("\u200c", "")
            .replace("\u200d", "")
        )

        # Strip control characters
        q = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", q)

        # Collapse whitespace
        q = re.sub(r"\s+", " ", q).strip()

        return q

    # --------------------------------------------------------------------------
    # FILTER BUILDER
    # --------------------------------------------------------------------------

    def _build_where_clause(
        self,
        source_type: Optional[str] = None,
        language: Optional[str] = None,
        document_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Constructs ChromaDB-compatible `where` filter dictionary.
        Supports single or composite ($and) filter clauses.
        """
        filters: List[Dict[str, Any]] = []

        if source_type:
            filters.append({"source_type": source_type.strip().lower()})
        if language:
            filters.append({"language": language.strip().lower()})
        if document_id:
            filters.append({"document_id": document_id.strip()})

        if not filters:
            return None
        if len(filters) == 1:
            return filters[0]
        return {"$and": filters}

    def _compute_lexical_score(self, query: str, content: str, title: str) -> float:
        """
        Calculates lexical token overlap between query terms and chunk content/title.
        Supports Tamil script words, English tokens, and alphanumeric identifiers.
        """
        # Split tokens with min length 2
        tokens = [t for t in re.findall(r"\w+", query.lower()) if len(t) >= 2]
        if not tokens:
            return 0.0

        corpus = f"{title} {content}".lower()
        matched_tokens = sum(1 for t in tokens if t in corpus)
        return matched_tokens / len(tokens)

    # --------------------------------------------------------------------------
    # RETRIEVAL PIPELINE
    # --------------------------------------------------------------------------

    def search(
        self,
        query: str,
        top_k: int = 5,
        source_type: Optional[str] = None,
        language: Optional[str] = None,
        document_id: Optional[str] = None,
        min_score: Optional[float] = None,
        db: Optional[Session] = None,
    ) -> List[SearchResultItem]:
        """
        Executes end-to-end RAG retrieval pipeline:
        - Query normalization
        - ChromaDB semantic similarity search
        - Distance to relevance score mapping with hybrid lexical re-ranking
        - Duplicate detection & deduplication
        - Relevance score thresholding
        - SQLite metadata verification
        """
        normalized_query = self.normalize_query(query)
        if not normalized_query:
            return []

        # Build ChromaDB filter
        where_clause = self._build_where_clause(
            source_type=source_type,
            language=language,
            document_id=document_id,
        )

        total_chunks = self.vector_store.get_total_chunks()
        if total_chunks == 0:
            logger.info("Vector knowledge base is empty. Returning 0 results.")
            return []

        # Request more candidates to accommodate post-filtering and deduplication
        fetch_limit = min(total_chunks, max(top_k * 4, 15))

        raw_results = self.vector_store.query_similar(
            query_text=normalized_query,
            n_results=fetch_limit,
            where=where_clause,
        )

        # Cache for verified SQLite documents to avoid redundant DB queries
        doc_cache: Dict[str, Optional[Any]] = {}

        candidate_items: List[SearchResultItem] = []
        seen_texts: set = set()

        for raw in raw_results:
            content = raw.get("content", "").strip()
            if not content:
                continue

            # Deduplication key based on normalized content text
            norm_content_key = " ".join(content.lower().split())
            if norm_content_key in seen_texts:
                continue

            metadata = raw.get("metadata", {})
            distance = raw.get("distance", 0.0)

            # Map cosine distance to normalized dense score in [0.0, 1.0]
            dense_score = max(0.0, min(1.0, 1.0 - (distance / 2.0)))

            doc_id = metadata.get("document_id")
            source_title = metadata.get("title", "Unknown Source")
            source_url = metadata.get("source_url") or None
            item_source_type = metadata.get("source_type") or source_type
            item_language = metadata.get("language") or language
            page_num = metadata.get("page_number")
            para_ref = metadata.get("paragraph_reference") or None

            # SQLite verification and enrichment if DB session is supplied
            if db and doc_id:
                if doc_id not in doc_cache:
                    doc_cache[doc_id] = crud.get_knowledge_document(db, doc_id)
                db_doc = doc_cache[doc_id]

                if not db_doc:
                    # Skip chunk if document was deleted from SQLite
                    continue
                if db_doc.document_status != DocumentStatus.INDEXED.value:
                    # Skip chunk if document is not in indexed status
                    continue

                # Enrich with authoritative SQLite metadata
                source_title = db_doc.title
                source_url = db_doc.source_url or source_url
                item_source_type = db_doc.source_type
                item_language = db_doc.language

            # Hybrid score: combines dense embedding similarity with exact term matching
            lexical_score = self._compute_lexical_score(normalized_query, content, source_title)
            relevance_score = round(max(0.0, min(1.0, 0.70 * dense_score + 0.30 * lexical_score)), 4)

            # Apply min_score filter if requested
            if min_score is not None and relevance_score < min_score:
                continue

            item = SearchResultItem(
                chunk_id=raw.get("chunk_id"),
                content=content,
                source_title=source_title,
                source_url=source_url,
                relevance_score=relevance_score,
                page_number=page_num if page_num and page_num > 0 else None,
                paragraph_reference=para_ref,
                source_type=item_source_type,
                language=item_language,
            )

            seen_texts.add(norm_content_key)
            candidate_items.append(item)

        # Rank candidate items by relevance score descending
        candidate_items.sort(key=lambda x: x.relevance_score, reverse=True)
        final_items = candidate_items[:top_k]

        logger.info(
            f"Retrieved {len(final_items)} chunks for query '{normalized_query[:50]}' (top_k={top_k})"
        )
        return final_items


# Singleton retrieval service instance
_retrieval_service_instance: Optional[RetrievalService] = None


def get_retrieval_service() -> RetrievalService:
    """
    Returns the singleton RetrievalService instance.
    """
    global _retrieval_service_instance
    if _retrieval_service_instance is None:
        _retrieval_service_instance = RetrievalService()
    return _retrieval_service_instance
