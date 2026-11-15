from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.models.enums import AnswerType


class AnswerBase(BaseModel):
    question_id: Optional[str] = Field(None, description="Optional foreign key ID of the parent question")
    answer_text: str = Field(..., min_length=1, description="Answer text content")
    answer_type: str = Field(
        default="short",
        description="Type of answer: 'short', 'detailed', 'scripture_focused', 'user_draft'",
    )
    sources_json: Optional[str] = Field(None, description="Optional JSON-serialized source references")

    @field_validator("answer_type")
    @classmethod
    def validate_answer_type(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {at.value for at in AnswerType}
        if clean not in allowed:
            raise ValueError(f"Invalid answer_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class AnswerCreate(AnswerBase):
    pass


class AnswerUpdate(BaseModel):
    question_id: Optional[str] = None
    answer_text: Optional[str] = Field(None, min_length=1)
    answer_type: Optional[str] = None
    sources_json: Optional[str] = None

    @field_validator("answer_type")
    @classmethod
    def validate_answer_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        clean = v.strip().lower()
        allowed = {at.value for at in AnswerType}
        if clean not in allowed:
            raise ValueError(f"Invalid answer_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class AnswerResponse(AnswerBase):
    id: str
    created_at: datetime
    updated_at: datetime
    sources: list[dict] = Field(default_factory=list, description="Parsed reference sources")

    model_config = {"from_attributes": True}


class AnswerSourceItem(BaseModel):
    source_title: str = Field(..., description="Title of the publication or document")
    source_url: Optional[str] = Field(None, description="URL or locator of the publication")
    paragraph_reference: Optional[str] = Field(None, description="Paragraph locator")
    content_snippet: str = Field(..., description="Extracted relevant text excerpt")
    relevance_score: float = Field(..., description="Relevance score from vector retrieval")
    source_type: Optional[str] = Field(None, description="Category of the publication")
    page_number: Optional[int] = Field(None, description="Page number")


class AnswerGenerateRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000, description="Meeting question to answer")
    answer_type: str = Field("short", description="Answer type: 'short' (~20-40s) or 'detailed' (~45-90s)")
    language: str = Field("ta", min_length=2, max_length=10, description="Target answer language code (default: 'ta')")
    question_id: Optional[str] = Field(None, description="Optional SQLite question ID to link with generated answer")
    save_answer: bool = Field(False, description="Whether to persist the generated answer into the SQLite answers table")
    save_to_history: bool = Field(True, description="Whether to record question and answer into search history")
    custom_instructions: Optional[str] = Field(None, max_length=500, description="Optional custom guidelines or notes")

    @field_validator("answer_type")
    @classmethod
    def validate_answer_type(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {"short", "detailed", "scripture_focused"}
        if clean not in allowed:
            raise ValueError(f"Invalid answer_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class AnswerGenerateResponse(BaseModel):
    answer: str = Field(..., description="Generated answer in natural conversational Tamil")
    sources: list[AnswerSourceItem] = Field(default_factory=list, description="Retrieved reference sources used")
    answer_type: str = Field(..., description="Answer type: 'short' or 'detailed'")
    model_used: Optional[str] = Field(None, description="LLM model identifier used for generation")
    saved_answer_id: Optional[str] = Field(None, description="SQLite answer ID if saved")

