from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException, EntityNotFoundException, ValidationException
from app.core.security import sanitize_filename, validate_file_upload
from app.database import crud
from app.database.connection import get_db
from app.schemas.knowledge import (
    KnowledgeDocumentDetailResponse,
    KnowledgeIngestResponse,
    KnowledgeIngestTextRequest,
)
from app.services.ingestion import (
    DocumentExtractionError,
    SUPPORTED_EXTENSIONS,
    get_ingestion_service,
)
from app.services.vector_store import get_vector_store

router = APIRouter(prefix="/knowledge", tags=["Knowledge Ingestion"])


@router.post(
    "/ingest",
    response_model=KnowledgeIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Document File",
    description="Upload and ingest a document file (.pdf or .txt) into the vector knowledge base.",
)
async def ingest_file(
    file: UploadFile = File(..., description="Document file to upload (.pdf, .txt)"),
    title: str = Form(..., min_length=1, max_length=255, description="Document or publication title"),
    source_type: str = Form("other", description="Source category (e.g. watchtower, awake, meeting_workbook, bible, manual, other)"),
    source_url: Optional[str] = Form(None, description="Optional reference URL"),
    language: str = Form("ta", min_length=2, max_length=10, description="Language code (default: 'ta')"),
    db: Session = Depends(get_db),
) -> KnowledgeIngestResponse:
    if not file.filename:
        raise AppException(
            message="Uploaded file must have a filename",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_FILE",
        )

    file_bytes = await file.read()
    # Validate extension, file size, null-bytes, magic bytes, and sanitize filename
    sanitized_filename, ext = validate_file_upload(
        filename=file.filename,
        file_bytes=file_bytes,
        max_size_mb=settings.MAX_UPLOAD_SIZE_MB,
    )

    ingestion_service = get_ingestion_service()
    try:
        doc, chunks_count = ingestion_service.ingest(
            db=db,
            title=title,
            source_type=source_type,
            source_url=source_url,
            language=language,
            file_bytes=file_bytes,
            filename=sanitized_filename,
        )
    except DocumentExtractionError as e:
        raise ValidationException(
            message=str(e),
            details={"filename": file.filename},
        )
    except Exception as e:
        raise AppException(
            message=f"Document ingestion failed: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INGESTION_ERROR",
        )

    doc_detail = KnowledgeDocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        source_type=doc.source_type,
        source_url=doc.source_url,
        language=doc.language,
        document_status=doc.document_status,
        created_at=doc.created_at,
        chunk_count=chunks_count,
    )
    return KnowledgeIngestResponse(
        document=doc_detail,
        chunks_created=chunks_count,
        message=f"Successfully ingested and indexed '{doc.title}' with {chunks_count} chunks.",
    )


@router.post(
    "/ingest-text",
    response_model=KnowledgeIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Raw Text",
    description="Ingest raw text content into the vector knowledge base.",
)
def ingest_text(
    payload: KnowledgeIngestTextRequest,
    db: Session = Depends(get_db),
) -> KnowledgeIngestResponse:
    if not payload.content.strip():
        raise ValidationException(
            message="Content text cannot be blank or whitespace only.",
            details={"field": "content"},
        )

    ingestion_service = get_ingestion_service()
    try:
        doc, chunks_count = ingestion_service.ingest(
            db=db,
            title=payload.title,
            source_type=payload.source_type,
            source_url=payload.source_url,
            language=payload.language,
            raw_text=payload.content,
        )
    except DocumentExtractionError as e:
        raise ValidationException(
            message=str(e),
            details={"title": payload.title},
        )
    except Exception as e:
        raise AppException(
            message=f"Text ingestion failed: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INGESTION_ERROR",
        )

    doc_detail = KnowledgeDocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        source_type=doc.source_type,
        source_url=doc.source_url,
        language=doc.language,
        document_status=doc.document_status,
        created_at=doc.created_at,
        chunk_count=chunks_count,
    )
    return KnowledgeIngestResponse(
        document=doc_detail,
        chunks_created=chunks_count,
        message=f"Successfully ingested and indexed text document '{doc.title}' with {chunks_count} chunks.",
    )


@router.get(
    "/documents",
    response_model=List[KnowledgeDocumentDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="List Knowledge Documents",
    description="List all ingested reference documents with optional filters and chunk counts.",
)
def list_documents(
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    language: Optional[str] = Query(None, description="Filter by language code"),
    document_status: Optional[str] = Query(None, description="Filter by document status (indexed, pending, failed, archived)"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Limit for pagination"),
    db: Session = Depends(get_db),
) -> List[KnowledgeDocumentDetailResponse]:
    docs = crud.list_knowledge_documents(
        db=db,
        source_type=source_type,
        document_status=document_status,
        language=language,
        skip=skip,
        limit=limit,
    )
    vector_store = get_vector_store()
    results: List[KnowledgeDocumentDetailResponse] = []
    for d in docs:
        chunk_count = vector_store.count_document_chunks(d.id)
        results.append(
            KnowledgeDocumentDetailResponse(
                id=d.id,
                title=d.title,
                source_type=d.source_type,
                source_url=d.source_url,
                language=d.language,
                document_status=d.document_status,
                created_at=d.created_at,
                chunk_count=chunk_count,
            )
        )
    return results


@router.get(
    "/documents/{document_id}",
    response_model=KnowledgeDocumentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Knowledge Document Details",
    description="Retrieve document metadata and vector chunk statistics by document ID.",
)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> KnowledgeDocumentDetailResponse:
    doc = crud.get_knowledge_document(db, document_id)
    if not doc:
        raise EntityNotFoundException(
            message=f"Knowledge document with ID '{document_id}' not found.",
            details={"document_id": document_id},
        )
    vector_store = get_vector_store()
    chunk_count = vector_store.count_document_chunks(doc.id)
    return KnowledgeDocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        source_type=doc.source_type,
        source_url=doc.source_url,
        language=doc.language,
        document_status=doc.document_status,
        created_at=doc.created_at,
        chunk_count=chunk_count,
    )


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Knowledge Document",
    description="Delete a knowledge document from SQLite and purge all its chunk embeddings from ChromaDB.",
)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    doc = crud.get_knowledge_document(db, document_id)
    if not doc:
        raise EntityNotFoundException(
            message=f"Knowledge document with ID '{document_id}' not found.",
            details={"document_id": document_id},
        )

    # 1. Purge chunks from ChromaDB
    vector_store = get_vector_store()
    purged_chunks = vector_store.delete_document_chunks(document_id)

    # 2. Delete document record from SQLite
    crud.delete_knowledge_document(db, document_id)

    return {
        "success": True,
        "detail": f"Knowledge document '{doc.title}' and {purged_chunks} vector chunks deleted successfully.",
        "id": document_id,
    }
