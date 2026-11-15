from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.models.enums import DocumentStatus, SourceType


class KnowledgeDocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Publication or document title")
    source_type: str = Field(..., description="Source publication category")
    source_url: Optional[str] = Field(None, max_length=1024, description="URL or reference locator")
    language: str = Field("ta", min_length=2, max_length=10, description="Document language code")
    document_status: str = Field("pending", description="Processing status of document")

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {st.value for st in SourceType}
        if clean not in allowed:
            raise ValueError(f"Invalid source_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean

    @field_validator("document_status")
    @classmethod
    def validate_document_status(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {ds.value for ds in DocumentStatus}
        if clean not in allowed:
            raise ValueError(f"Invalid document_status '{v}'. Allowed statuses: {sorted(list(allowed))}")
        return clean


class KnowledgeDocumentCreate(KnowledgeDocumentBase):
    pass


class KnowledgeDocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    source_type: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=1024)
    language: Optional[str] = Field(None, min_length=2, max_length=10)
    document_status: Optional[str] = None

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        clean = v.strip().lower()
        allowed = {st.value for st in SourceType}
        if clean not in allowed:
            raise ValueError(f"Invalid source_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean

    @field_validator("document_status")
    @classmethod
    def validate_document_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        clean = v.strip().lower()
        allowed = {ds.value for ds in DocumentStatus}
        if clean not in allowed:
            raise ValueError(f"Invalid document_status '{v}'. Allowed statuses: {sorted(list(allowed))}")
        return clean


class KnowledgeDocumentResponse(KnowledgeDocumentBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeIngestTextRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Document or publication title")
    content: str = Field(..., min_length=1, description="Raw text content to ingest and index")
    source_type: str = Field("other", description="Source category (e.g. watchtower, awake, meeting_workbook, bible, manual, other)")
    source_url: Optional[str] = Field(None, max_length=1024, description="Optional reference or canonical URL")
    language: str = Field("ta", min_length=2, max_length=10, description="Language code")

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        clean = v.strip().lower()
        allowed = {st.value for st in SourceType}
        if clean not in allowed:
            raise ValueError(f"Invalid source_type '{v}'. Allowed types: {sorted(list(allowed))}")
        return clean


class KnowledgeDocumentDetailResponse(KnowledgeDocumentResponse):
    chunk_count: int = Field(0, description="Number of vector chunks indexed in ChromaDB")


class KnowledgeIngestResponse(BaseModel):
    document: KnowledgeDocumentDetailResponse
    chunks_created: int
    message: str


class KnowledgeDocumentListResponse(BaseModel):
    items: list[KnowledgeDocumentDetailResponse]
    total: int
    skip: int
    limit: int

