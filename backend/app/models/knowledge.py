import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Index
from app.database.connection import Base


class KnowledgeDocument(Base):
    """
    Tracks external publications and reference documents processed for meeting context.
    Note: Vector embeddings are handled in ChromaDB; metadata and indexing status reside here.
    """
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False, index=True)
    source_url = Column(String(1024), nullable=True)
    language = Column(String(10), default="ta", nullable=False, index=True)
    document_status = Column(String(30), default="pending", nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_knowledge_source_status", "source_type", "document_status"),
    )

    def __repr__(self) -> str:
        return f"<KnowledgeDocument(id='{self.id}', title='{self.title}', status='{self.document_status}')>"
