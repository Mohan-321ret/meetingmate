from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.exceptions import EntityNotFoundException
from app.database import crud
from app.database.connection import get_db
from app.schemas.question import (
    QuestionCreate,
    QuestionReorderRequest,
    QuestionResponse,
    QuestionUpdate,
)

router = APIRouter(tags=["Questions"])


# ==============================================================================
# MEETING-SCOPED QUESTION ENDPOINTS (/api/v1/meetings/{id}/questions)
# ==============================================================================

@router.get(
    "/meetings/{meeting_id}/questions",
    response_model=List[QuestionResponse],
    status_code=status.HTTP_200_OK,
    summary="List Questions for a Meeting",
    description="Retrieve all questions belonging to a specific meeting, optionally filtered by section.",
)
def list_meeting_questions(
    meeting_id: str,
    section: Optional[str] = Query(
        None,
        description="Filter by section (e.g. 'treasures', 'ministry', 'living', 'public_talk', 'watchtower')",
        examples=["treasures", "watchtower"],
    ),
    db: Session = Depends(get_db),
) -> List[QuestionResponse]:
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise EntityNotFoundException(f"Meeting with ID '{meeting_id}' not found.")

    questions = crud.list_questions_by_meeting(db, meeting_id=meeting_id, section=section)
    return [QuestionResponse.model_validate(q) for q in questions]


@router.post(
    "/meetings/{meeting_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Question to Meeting",
    description="Add a new question under a specific meeting section with auto-assigned display order.",
)
def create_question_for_meeting(
    meeting_id: str,
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
) -> QuestionResponse:
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise EntityNotFoundException(f"Meeting with ID '{meeting_id}' not found.")

    # Always enforce the path meeting_id
    question_in.meeting_id = meeting_id

    # If display order is not explicitly provided (0), assign next available order
    if not question_in.display_order:
        question_in.display_order = crud.get_next_question_display_order(db, meeting_id)

    question = crud.create_question(db, question_in)
    return QuestionResponse.model_validate(question)


@router.put(
    "/meetings/{meeting_id}/questions/reorder",
    response_model=List[QuestionResponse],
    status_code=status.HTTP_200_OK,
    summary="Reorder Questions in Meeting",
    description="Update the display order of multiple questions within a meeting.",
)
def reorder_meeting_questions(
    meeting_id: str,
    reorder_in: QuestionReorderRequest,
    db: Session = Depends(get_db),
) -> List[QuestionResponse]:
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise EntityNotFoundException(f"Meeting with ID '{meeting_id}' not found.")

    updated_questions = crud.reorder_questions(db, meeting_id, reorder_in.items)
    return [QuestionResponse.model_validate(q) for q in updated_questions]


# ==============================================================================
# INDIVIDUAL QUESTION ENDPOINTS (/api/v1/questions/{id})
# ==============================================================================

@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Question by ID",
    description="Retrieve an individual question by its unique ID.",
)
def get_question(
    question_id: str,
    db: Session = Depends(get_db),
) -> QuestionResponse:
    question = crud.get_question(db, question_id)
    if not question:
        raise EntityNotFoundException(f"Question with ID '{question_id}' not found.")

    return QuestionResponse.model_validate(question)


@router.put(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Question",
    description="Update question details such as prompt text, paragraph reference, section, or display order.",
)
def update_question(
    question_id: str,
    question_in: QuestionUpdate,
    db: Session = Depends(get_db),
) -> QuestionResponse:
    question = crud.update_question(db, question_id, question_in)
    if not question:
        raise EntityNotFoundException(f"Question with ID '{question_id}' not found.")

    return QuestionResponse.model_validate(question)


@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Question",
    description="Delete a question and automatically cascade delete any associated answers.",
)
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
):
    deleted = crud.delete_question(db, question_id)
    if not deleted:
        raise EntityNotFoundException(f"Question with ID '{question_id}' not found.")

    return {
        "success": True,
        "message": f"Question '{question_id}' has been deleted.",
    }
