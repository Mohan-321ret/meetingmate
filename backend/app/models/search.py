import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from app.database.connection import Base


class SearchHistory(Base):
    """
    Stores historical queries along with the generated responses for quick retrieval.
    """
    __tablename__ = "search_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    answer_type = Column(String(50), nullable=True, default="short")
    sources_json = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<SearchHistory(id='{self.id}', query='{self.query[:30]}...')>"
