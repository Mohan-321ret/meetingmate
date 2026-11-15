import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base


class SavedAnswer(Base):
    """
    Stores personalized and curated meeting answers saved by family members,
    along with their own personal notes and custom titles.
    """
    __tablename__ = "saved_answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    answer_id = Column(
        String(36),
        ForeignKey("answers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    custom_title = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    answer = relationship("Answer", back_populates="saved_answers")

    def __repr__(self) -> str:
        return f"<SavedAnswer(id='{self.id}', answer_id='{self.answer_id}', title='{self.custom_title}')>"
