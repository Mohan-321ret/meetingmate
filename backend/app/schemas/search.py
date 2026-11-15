import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from app.models.enums import SourceType


class SearchHistoryBase(BaseModel):
    query: str = Field(..., min_length=1, description="Question or search query text")
    answer: str = Field(..., min_length=1, description="Generated or retrieved answer text")
    answer_type: Optional[str] = Field("short", description="Answer type (short, detailed)")
    sources_json: Optional[str] = Field(None, description="Serialized sources JSON")


class SearchHistoryCreate(SearchHistoryBase):
    pass


class SearchHistoryResponse(SearchHistoryBase):
    id: str
    created_at: datetime
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Parsed source references")

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_model(cls, history: Any) -> "SearchHistoryResponse":
        parsed_sources = []
        if getattr(history, "sources_json", None):
            try:
                parsed_sources = json.loads(history.sources_json)
            except Exception:
                parsed_sources = []
        return cls(
            id=history.id,
            query=history.query,
            answer=history.answer,
            answer_type=getattr(history, "answer_type", "short") or "short",
            sources_json=history.sources_json,
            created_at=history.created_at,
            sources=parsed_sources,
        )



class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Question or semantic search text")
    top_k: int = Field(5, ge=1, le=50, description="Maximum number of relevant chunks to retrieve")
    source_type: Optional[str] = Field(
        None,
        description="Optional filter by source type (watchtower, awake, meeting_workbook, bible, manual, other)",
    )
    language: Optional[str] = Field(
        None, min_length=2, max_length=10, description="Optional filter by language code (e.g. 'ta', 'en')"
    )
    min_score: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Optional minimum relevance score threshold between 0.0 and 1.0"
    )

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().lower()
        allowed = {st.value for st in SourceType}
        if clean not in allowed:
            raise ValueError(f"Invalid source_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class SearchResultItem(BaseModel):
    content: str = Field(..., description="Retrieved reference content")
    source_title: str = Field(..., description="Source publication or document title")
    source_url: Optional[str] = Field(None, description="Reference URL")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Normalized relevance score between 0.0 and 1.0")
    page_number: Optional[int] = Field(None, description="Page number of the chunk in source document")
    paragraph_reference: Optional[str] = Field(None, description="Paragraph locator reference")
    source_type: Optional[str] = Field(None, description="Source category")
    language: Optional[str] = Field(None, description="Language code")
    chunk_id: Optional[str] = Field(None, description="ChromaDB vector chunk identifier")


class SearchResponse(BaseModel):
    query: str = Field(..., description="Original question query")
    results: List[SearchResultItem] = Field(
        default_factory=list, description="Ranked list of relevant knowledge chunks"
    )
    total_results: int = Field(0, description="Total number of results returned")
