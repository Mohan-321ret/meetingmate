from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SavedAnswerBase(BaseModel):
    answer_id: Optional[str] = Field(None, description="Foreign key ID of an existing answer")
    custom_title: Optional[str] = Field(None, max_length=255, description="Custom label or question heading")
    notes: Optional[str] = Field(None, description="Personal study notes or family reminders")


class SavedAnswerCreate(SavedAnswerBase):
    answer_text: Optional[str] = Field(None, min_length=1, description="Direct answer text if saving an answer directly")
    answer_type: Optional[str] = Field("short", description="Answer type: 'short', 'detailed', etc.")
    question_id: Optional[str] = Field(None, description="Optional question ID to link with")


class SavedAnswerUpdate(BaseModel):
    custom_title: Optional[str] = Field(None, max_length=255, description="Updated custom title")
    notes: Optional[str] = Field(None, description="Updated notes")
    answer_text: Optional[str] = Field(None, min_length=1, description="Updated answer text")
    answer_type: Optional[str] = Field(None, description="Updated answer type")


class SavedAnswerResponse(SavedAnswerBase):
    id: str
    created_at: datetime
    answer_text: Optional[str] = None
    answer_type: Optional[str] = None
    question_id: Optional[str] = None
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Parsed reference sources")

    model_config = {"from_attributes": True}


class SavedAnswerDetailResponse(SavedAnswerResponse):
    meeting_id: Optional[str] = None
    meeting_title: Optional[str] = None
    question_text: Optional[str] = None
    paragraph_reference: Optional[str] = None
