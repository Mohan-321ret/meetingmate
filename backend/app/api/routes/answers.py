import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.database import crud
from app.database.connection import get_db
from app.schemas.answer import (
    AnswerCreate,
    AnswerGenerateRequest,
    AnswerGenerateResponse,
    AnswerResponse,
    AnswerUpdate,
)
from app.services.answer_generator import get_answer_generator

logger = logging.getLogger("meetingmate.api.answers")

router = APIRouter(prefix="/answers", tags=["Answers"])


@router.post(
    "/generate",
    response_model=AnswerGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI Answer",
    description="Generates a natural conversational Tamil answer for predefined meeting questions or independent questions.",
)
async def generate_answer(
    payload: AnswerGenerateRequest,
    db: Session = Depends(get_db),
) -> AnswerGenerateResponse:
    if not payload.question.strip():
        raise ValidationException(
            message="Question cannot be empty or whitespace only.",
            details={"field": "question"},
        )

    generator = get_answer_generator()
    return await generator.generate_answer_async(payload, db=db)


@router.post(
    "/independent",
    response_model=AnswerGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask Independent Question",
    description="Ask an independent question outside meeting materials using the RAG retrieval and answer pipeline.",
)
async def ask_independent_question(
    payload: AnswerGenerateRequest,
    db: Session = Depends(get_db),
) -> AnswerGenerateResponse:
    if not payload.question.strip():
        raise ValidationException(
            message="Question cannot be empty or whitespace only.",
            details={"field": "question"},
        )

    # Force question_id to None for independent questions
    payload.question_id = None
    generator = get_answer_generator()
    return await generator.generate_answer_async(payload, db=db)


@router.post(
    "/generate-for-question/{question_id}",
    response_model=AnswerGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Answer for Meeting Question",
    description="Generates an answer for a specific meeting question by ID, preserving the relationship between meeting, question, answer, and sources.",
)
async def generate_for_meeting_question(
    question_id: str,
    answer_type: str = Query("short", description="Answer type: 'short' or 'detailed'"),
    language: str = Query("ta", description="Language code"),
    save_answer: bool = Query(True, description="Whether to persist the generated answer in the database"),
    db: Session = Depends(get_db),
) -> AnswerGenerateResponse:
    generator = get_answer_generator()
    return await generator.generate_for_question_async(
        db=db,
        question_id=question_id,
        answer_type=answer_type,
        language=language,
        save_answer=save_answer,
    )


@router.get(
    "/question/{question_id}",
    response_model=List[AnswerResponse],
    status_code=status.HTTP_200_OK,
    summary="List Answers for Question",
    description="Retrieve all generated and manual answers associated with a specific question.",
)
def list_answers_for_question(
    question_id: str,
    db: Session = Depends(get_db),
) -> List[AnswerResponse]:
    q = crud.get_question(db, question_id)
    if not q:
        raise EntityNotFoundException(
            message=f"Question with ID '{question_id}' not found.",
            details={"question_id": question_id},
        )
    answers = crud.list_answers_by_question(db, question_id)
    out = []
    for a in answers:
        resp = AnswerResponse.model_validate(a)
        if a.sources_json:
            try:
                resp.sources = json.loads(a.sources_json)
            except Exception:
                resp.sources = []
        out.append(resp)
    return out


@router.post(
    "",
    response_model=AnswerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Answer Manually",
    description="Create and store a manual or user-edited answer.",
)
def create_answer(
    payload: AnswerCreate,
    db: Session = Depends(get_db),
) -> AnswerResponse:
    if payload.question_id:
        question = crud.get_question(db, payload.question_id)
        if not question:
            raise EntityNotFoundException(
                message=f"Question with ID '{payload.question_id}' not found.",
                details={"question_id": payload.question_id},
            )
    answer = crud.create_answer(db, payload)
    resp = AnswerResponse.model_validate(answer)
    if answer.sources_json:
        try:
            resp.sources = json.loads(answer.sources_json)
        except Exception:
            resp.sources = []
    return resp


@router.get(
    "/{answer_id}",
    response_model=AnswerResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Answer",
    description="Retrieve a saved answer by ID.",
)
def get_answer(
    answer_id: str,
    db: Session = Depends(get_db),
) -> AnswerResponse:
    answer = crud.get_answer(db, answer_id)
    if not answer:
        raise EntityNotFoundException(
            message=f"Answer with ID '{answer_id}' not found.",
            details={"answer_id": answer_id},
        )
    resp = AnswerResponse.model_validate(answer)
    if answer.sources_json:
        try:
            resp.sources = json.loads(answer.sources_json)
        except Exception:
            resp.sources = []
    return resp


@router.put(
    "/{answer_id}",
    response_model=AnswerResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Answer",
    description="Update an existing answer.",
)
def update_answer(
    answer_id: str,
    payload: AnswerUpdate,
    db: Session = Depends(get_db),
) -> AnswerResponse:
    answer = crud.update_answer(db, answer_id, payload)
    if not answer:
        raise EntityNotFoundException(
            message=f"Answer with ID '{answer_id}' not found.",
            details={"answer_id": answer_id},
        )
    resp = AnswerResponse.model_validate(answer)
    if answer.sources_json:
        try:
            resp.sources = json.loads(answer.sources_json)
        except Exception:
            resp.sources = []
    return resp


@router.delete(
    "/{answer_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Answer",
    description="Delete an answer from SQLite.",
)
def delete_answer(
    answer_id: str,
    db: Session = Depends(get_db),
):
    success = crud.delete_answer(db, answer_id)
    if not success:
        raise EntityNotFoundException(
            message=f"Answer with ID '{answer_id}' not found.",
            details={"answer_id": answer_id},
        )
    return {"success": True, "detail": "Answer deleted successfully.", "id": answer_id}
