import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Question(Base):
    """
    Stores individual meeting questions belonging to specific sections.
    """
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(
        String(36),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section = Column(String(100), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    paragraph_reference = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    meeting = relationship("Meeting", back_populates="questions")
    answers = relationship(
        "Answer",
        back_populates="question",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_questions_meeting_order", "meeting_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<Question(id='{self.id}', meeting_id='{self.meeting_id}', section='{self.section}')>"
