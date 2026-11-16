from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.models.enums import MeetingType
from app.schemas.question import QuestionResponse


class MeetingBase(BaseModel):
    meeting_type: str = Field(..., description="Meeting type: 'midweek' or 'weekend'")
    meeting_date: datetime = Field(..., description="Date and time of the meeting")
    title: str = Field(..., min_length=1, max_length=255, description="Title of the meeting")
    description: Optional[str] = Field(None, description="Optional meeting overview or description")

    @field_validator("meeting_type")
    @classmethod
    def validate_meeting_type(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {mt.value for mt in MeetingType}
        if clean not in allowed:
            raise ValueError(f"Invalid meeting_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    meeting_type: Optional[str] = None
    meeting_date: Optional[datetime] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

    @field_validator("meeting_type")
    @classmethod
    def validate_meeting_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        clean = v.strip().lower()
        allowed = {mt.value for mt in MeetingType}
        if clean not in allowed:
            raise ValueError(f"Invalid meeting_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class MeetingResponse(MeetingBase):
    id: str
    created_at: datetime
    updated_at: datetime
    question_count: Optional[int] = Field(0, description="Number of questions in this meeting")

    model_config = {"from_attributes": True}


class MeetingDetailResponse(MeetingResponse):
    questions: List[QuestionResponse] = Field(default_factory=list, description="Questions belonging to this meeting")

    model_config = {"from_attributes": True}


class JWMeetingSyncResponse(BaseModel):
    """
    Response schema after syncing weekly meetings from JW.org.
    """
    success: bool = True
    week_label: str
    target_date: str
    midweek_meeting: Optional[MeetingResponse] = None
    weekend_meeting: Optional[MeetingResponse] = None
    total_questions_created: int = 0
    chroma_chunks_indexed: int = 0
    source_urls: List[str] = Field(default_factory=list)
    message: str


class CurrentWeekMeetingsResponse(BaseModel):
    """
    Response schema returning active current week meetings.
    """
    week_label: str
    start_date: str
    end_date: str
    midweek: Optional[MeetingDetailResponse] = None
    weekend: Optional[MeetingDetailResponse] = None
