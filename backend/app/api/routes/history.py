import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException
from app.database import crud
from app.database.connection import get_db
from app.schemas.search import SearchHistoryResponse

logger = logging.getLogger("meetingmate.api.history")

router = APIRouter(prefix="/history", tags=["Search & Question History"])


@router.get(
    "",
    response_model=List[SearchHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List Search History",
    description="Retrieve recent questions, generated answers, and associated source references.",
)
def list_history(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Limit for pagination"),
    db: Session = Depends(get_db),
) -> List[SearchHistoryResponse]:
    history_items = crud.list_search_history(db, skip=skip, limit=limit)
    return [SearchHistoryResponse.from_orm_model(item) for item in history_items]


@router.get(
    "/{history_id}",
    response_model=SearchHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get History Record",
    description="Retrieve a single search history record by ID.",
)
def get_history_item(
    history_id: str,
    db: Session = Depends(get_db),
) -> SearchHistoryResponse:
    item = crud.get_search_history(db, history_id)
    if not item:
        raise EntityNotFoundException(
            message=f"Search history record with ID '{history_id}' not found.",
            details={"history_id": history_id},
        )
    return SearchHistoryResponse.from_orm_model(item)


@router.delete(
    "/{history_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete History Record",
    description="Delete a specific search history record.",
)
def delete_history_item(
    history_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    success = crud.delete_search_history(db, history_id)
    if not success:
        raise EntityNotFoundException(
            message=f"Search history record with ID '{history_id}' not found.",
            details={"history_id": history_id},
        )
    return {
        "success": True,
        "detail": "Search history record deleted successfully.",
        "id": history_id,
    }


@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Clear Search History",
    description="Deletes all recorded search history entries.",
)
def clear_all_history(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    deleted_count = crud.clear_search_history(db)
    return {
        "success": True,
        "detail": f"Successfully deleted and cleared {deleted_count} search history records.",
        "deleted_count": deleted_count,
    }
