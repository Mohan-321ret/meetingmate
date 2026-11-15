import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.database import crud
from app.database.connection import get_db
from app.models.saved_answer import SavedAnswer
from app.schemas.saved_answer import (
    SavedAnswerCreate,
    SavedAnswerDetailResponse,
    SavedAnswerUpdate,
)

logger = logging.getLogger("meetingmate.api.saved_answers")

router = APIRouter(prefix="/saved-answers", tags=["Saved Answers"])


def _build_saved_answer_response(saved: SavedAnswer) -> SavedAnswerDetailResponse:
    sources = []
    answer_text = None
    answer_type = None
    question_id = None
    meeting_id = None
    meeting_title = None
    question_text = None
    para_ref = None

    if saved.answer:
        answer_text = saved.answer.answer_text
        answer_type = saved.answer.answer_type
        question_id = saved.answer.question_id
        if saved.answer.sources_json:
            try:
                sources = json.loads(saved.answer.sources_json)
            except Exception:
                sources = []

        if saved.answer.question:
            q = saved.answer.question
            question_text = q.question_text
            para_ref = q.paragraph_reference
            if q.meeting:
                meeting_id = q.meeting.id
                meeting_title = q.meeting.title

    return SavedAnswerDetailResponse(
        id=saved.id,
        answer_id=saved.answer_id,
        custom_title=saved.custom_title,
        notes=saved.notes,
        created_at=saved.created_at,
        answer_text=answer_text,
        answer_type=answer_type,
        question_id=question_id,
        sources=sources,
        meeting_id=meeting_id,
        meeting_title=meeting_title,
        question_text=question_text,
        paragraph_reference=para_ref,
    )


@router.post(
    "",
    response_model=SavedAnswerDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save Answer",
    description="Save a generated or manual answer with optional custom title and family study notes.",
)
def save_answer(
    payload: SavedAnswerCreate,
    db: Session = Depends(get_db),
) -> SavedAnswerDetailResponse:
    if not payload.answer_id and not payload.answer_text:
        raise ValidationException(
            message="Either 'answer_id' or 'answer_text' must be provided to save an answer.",
            details={"fields": ["answer_id", "answer_text"]},
        )

    # If answer_id is specified, verify it exists
    if payload.answer_id:
        existing_answer = crud.get_answer(db, payload.answer_id)
        if not existing_answer:
            raise EntityNotFoundException(
                message=f"Answer with ID '{payload.answer_id}' not found.",
                details={"answer_id": payload.answer_id},
            )

    try:
        saved = crud.create_saved_answer(db, payload)
    except ValueError as e:
        raise ValidationException(message=str(e))

    return _build_saved_answer_response(saved)


@router.get(
    "",
    response_model=List[SavedAnswerDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="List Saved Answers",
    description="Retrieve all saved answers with joined answer text, meeting information, and notes.",
)
def list_saved_answers(
    question_id: Optional[str] = Query(None, description="Filter by question ID"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Limit for pagination"),
    db: Session = Depends(get_db),
) -> List[SavedAnswerDetailResponse]:
    items = crud.list_saved_answers(db, question_id=question_id, skip=skip, limit=limit)
    return [_build_saved_answer_response(item) for item in items]


@router.get(
    "/{saved_id}",
    response_model=SavedAnswerDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Saved Answer",
    description="Retrieve a single saved answer with full meeting and question details.",
)
def get_saved_answer(
    saved_id: str,
    db: Session = Depends(get_db),
) -> SavedAnswerDetailResponse:
    saved = crud.get_saved_answer(db, saved_id)
    if not saved:
        raise EntityNotFoundException(
            message=f"Saved answer with ID '{saved_id}' not found.",
            details={"saved_id": saved_id},
        )
    return _build_saved_answer_response(saved)


@router.put(
    "/{saved_id}",
    response_model=SavedAnswerDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Saved Answer",
    description="Update personal notes, custom title, or answer content for a saved answer.",
)
def update_saved_answer(
    saved_id: str,
    payload: SavedAnswerUpdate,
    db: Session = Depends(get_db),
) -> SavedAnswerDetailResponse:
    saved = crud.get_saved_answer(db, saved_id)
    if not saved:
        raise EntityNotFoundException(
            message=f"Saved answer with ID '{saved_id}' not found.",
            details={"saved_id": saved_id},
        )

    updated = crud.update_saved_answer(db, saved_id, payload)
    return _build_saved_answer_response(updated)


@router.delete(
    "/{saved_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Saved Answer",
    description="Remove a saved answer from the user's saved list.",
)
def delete_saved_answer(
    saved_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    success = crud.delete_saved_answer(db, saved_id)
    if not success:
        raise EntityNotFoundException(
            message=f"Saved answer with ID '{saved_id}' not found.",
            details={"saved_id": saved_id},
        )
    return {
        "success": True,
        "detail": "Saved answer deleted successfully.",
        "id": saved_id,
    }
