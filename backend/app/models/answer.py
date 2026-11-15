import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Answer(Base):
    """
    Stores generated, curated, or drafted answers for questions.
    """
    __tablename__ = "answers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(
        String(36),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    answer_text = Column(Text, nullable=False)
    answer_type = Column(String(50), nullable=False, default="short", index=True)
    sources_json = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    question = relationship("Question", back_populates="answers")
    saved_answers = relationship(
        "SavedAnswer",
        back_populates="answer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_answers_question_type", "question_id", "answer_type"),
    )

    def __repr__(self) -> str:
        return f"<Answer(id='{self.id}', question_id='{self.question_id}', type='{self.answer_type}')>"
