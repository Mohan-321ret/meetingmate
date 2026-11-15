import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Index
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Meeting(Base):
    """
    Stores scheduled meeting instances (Midweek / Weekend).
    """
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_type = Column(String(20), nullable=False, index=True)
    meeting_date = Column(DateTime(timezone=True), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
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
    questions = relationship(
        "Question",
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Question.display_order",
    )

    __table_args__ = (
        Index("ix_meetings_type_date", "meeting_type", "meeting_date"),
    )

    def __repr__(self) -> str:
        return f"<Meeting(id='{self.id}', type='{self.meeting_type}', title='{self.title}')>"
