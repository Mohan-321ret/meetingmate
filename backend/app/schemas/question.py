from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class QuestionBase(BaseModel):
    meeting_id: Optional[str] = Field(None, description="Foreign key ID of the parent meeting")
    section: str = Field(..., min_length=1, max_length=100, description="Section of the meeting (e.g. 'treasures', 'ministry', 'living', 'public_talk', 'watchtower')")
    question_text: str = Field(..., min_length=1, description="Question prompt text")
    paragraph_reference: Optional[str] = Field(None, max_length=100, description="Paragraph or item reference")
    display_order: int = Field(0, ge=0, description="Sequential display order within the section")


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    section: Optional[str] = Field(None, min_length=1, max_length=100)
    question_text: Optional[str] = Field(None, min_length=1)
    paragraph_reference: Optional[str] = Field(None, max_length=100)
    display_order: Optional[int] = Field(None, ge=0)


class QuestionResponse(BaseModel):
    id: str
    meeting_id: str
    section: str
    question_text: str
    paragraph_reference: Optional[str] = None
    display_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionReorderItem(BaseModel):
    id: str = Field(..., description="ID of the question to reorder")
    display_order: int = Field(..., ge=0, description="New display order index")


class QuestionReorderRequest(BaseModel):
    items: List[QuestionReorderItem] = Field(..., min_length=1, description="List of question IDs and their new display order")
