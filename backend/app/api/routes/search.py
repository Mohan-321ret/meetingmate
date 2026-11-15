import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationException
from app.database.connection import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.services.retrieval import get_retrieval_service

logger = logging.getLogger("meetingmate.api.search")

router = APIRouter(prefix="/search", tags=["Search & Retrieval"])


@router.post(
    "",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Semantic Knowledge Search",
    description="Retrieve relevant publication chunks using semantic vector similarity and metadata filters.",
)
def search_knowledge(
    payload: SearchRequest,
    db: Session = Depends(get_db),
) -> SearchResponse:
    if not payload.query.strip():
        raise ValidationException(
            message="Search query cannot be empty or whitespace only.",
            details={"field": "query"},
        )

    retrieval_service = get_retrieval_service()
    results = retrieval_service.search(
        query=payload.query,
        top_k=payload.top_k,
        source_type=payload.source_type,
        language=payload.language,
        min_score=payload.min_score,
        db=db,
    )

    return SearchResponse(
        query=payload.query,
        results=results,
        total_results=len(results),
    )
