import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import chromadb
from app.core.config import BASE_DIR, settings

logger = logging.getLogger("meetingmate.vector_store")


class ChromaVectorStore:
    """
    Persistent ChromaDB vector database manager for knowledge embeddings.
    Embeds document chunks locally using ChromaDB's built-in default embedding function.
    """

    DEFAULT_COLLECTION_NAME = "jw_knowledge_base"

    def __init__(self, persist_directory: Optional[str] = None):
        if persist_directory:
            p = Path(persist_directory)
            if not p.is_absolute():
                p = (BASE_DIR / p).resolve()
        else:
            p = settings.get_chroma_path()

        self.persist_path = str(p)
        Path(self.persist_path).mkdir(parents=True, exist_ok=True)

        logger.info(f"Initializing embedded ChromaDB client at: {self.persist_path}")
        chroma_settings = chromadb.config.Settings(
            anonymized_telemetry=settings.CHROMA_ANONYMIZED_TELEMETRY,
            is_persistent=True,
            persist_directory=self.persist_path,
        )
        self.client = chromadb.PersistentClient(path=self.persist_path, settings=chroma_settings)

    def get_or_create_collection(self, name: str = DEFAULT_COLLECTION_NAME):
        """
        Retrieves or initializes a ChromaDB collection with default embedding function.
        """
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        collection_name: str = DEFAULT_COLLECTION_NAME,
    ) -> int:
        """
        Upserts chunk documents and their associated metadata into ChromaDB.
        Each chunk item should contain:
        - chunk_id: str
        - document_id: str
        - content: str
        - metadata fields: title, source_type, page_number, etc.
        """
        if not chunks:
            return 0

        collection = self.get_or_create_collection(collection_name)

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for c in chunks:
            ids.append(c["chunk_id"])
            raw_text = c["content"]
            title = str(c.get("title") or "")
            if title and not raw_text.startswith(title):
                embedded_text = f"{title}\n\n{raw_text}"
            else:
                embedded_text = raw_text
            documents.append(embedded_text)

            # ChromaDB metadata must only contain str, int, float, bool
            meta: Dict[str, Any] = {
                "document_id": str(c.get("document_id", "")),
                "title": title,
                "source_type": str(c.get("source_type", "other")),
                "source_url": str(c.get("source_url") or ""),
                "language": str(c.get("language", "ta")),
                "page_number": int(c.get("page_number") or 1),
                "paragraph_reference": str(c.get("paragraph_reference") or ""),
                "chunk_index": int(c.get("chunk_index", 0)),
                "raw_content": raw_text,
            }
            metadatas.append(meta)

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"Indexed {len(chunks)} chunks into ChromaDB collection '{collection_name}'")
        return len(chunks)

    def count_document_chunks(
        self,
        document_id: str,
        collection_name: str = DEFAULT_COLLECTION_NAME,
    ) -> int:
        """
        Returns the number of vector chunks stored for a specific document ID.
        """
        try:
            collection = self.get_or_create_collection(collection_name)
            result = collection.get(
                where={"document_id": document_id},
                include=[],
            )
            return len(result["ids"]) if result and "ids" in result else 0
        except Exception as e:
            logger.warning(f"Error counting chunks for document {document_id}: {e}")
            return 0

    def delete_document_chunks(
        self,
        document_id: str,
        collection_name: str = DEFAULT_COLLECTION_NAME,
    ) -> int:
        """
        Removes all vector embeddings and chunks associated with a document.
        """
        try:
            collection = self.get_or_create_collection(collection_name)
            existing_count = self.count_document_chunks(document_id, collection_name)
            if existing_count > 0:
                collection.delete(where={"document_id": document_id})
                logger.info(f"Purged {existing_count} chunks for document {document_id} from ChromaDB")
            return existing_count
        except Exception as e:
            logger.error(f"Failed to delete chunks for document {document_id}: {e}")
            return 0

    def query_similar(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME,
    ) -> List[Dict[str, Any]]:
        """
        Queries ChromaDB for semantically similar chunks based on cosine distance.
        """
        collection = self.get_or_create_collection(collection_name)
        total = collection.count()
        if total == 0:
            return []

        limit = min(n_results, total)
        results = collection.query(
            query_texts=[query_text],
            n_results=limit,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        output: List[Dict[str, Any]] = []
        if not results or not results.get("ids"):
            return output

        ids = results["ids"][0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for i in range(len(ids)):
            meta = metas[i] if i < len(metas) else {}
            content_str = meta.get("raw_content") or (docs[i] if i < len(docs) else "")
            output.append({
                "chunk_id": ids[i],
                "content": content_str,
                "metadata": meta,
                "distance": dists[i] if i < len(dists) else 0.0,
            })
        return output

    def get_total_chunks(self, collection_name: str = DEFAULT_COLLECTION_NAME) -> int:
        """
        Returns the total number of chunks currently stored in the collection.
        """
        collection = self.get_or_create_collection(collection_name)
        return collection.count()


# Singleton vector store instance
_vector_store_instance: Optional[ChromaVectorStore] = None


def get_vector_store() -> ChromaVectorStore:
    """
    Returns the singleton ChromaVectorStore instance.
    """
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = ChromaVectorStore()
    return _vector_store_instance
