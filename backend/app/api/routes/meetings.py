from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.exceptions import EntityNotFoundException
from app.database import crud
from app.database.connection import get_db
from app.schemas.meeting import (
    MeetingCreate,
    MeetingDetailResponse,
    MeetingResponse,
    MeetingUpdate,
)

router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.post(
    "",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Meeting",
    description="Create a new scheduled meeting (midweek or weekend).",
)
def create_meeting(
    meeting_in: MeetingCreate,
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = crud.create_meeting(db, meeting_in)
    return MeetingResponse.model_validate(meeting)


@router.get(
    "",
    response_model=List[MeetingResponse],
    status_code=status.HTTP_200_OK,
    summary="List Meetings",
    description="Retrieve all meetings with optional filtering by type (midweek/weekend) and calendar date.",
)
def list_meetings(
    meeting_type: Optional[str] = Query(
        None,
        description="Filter by meeting type ('midweek' or 'weekend')",
        examples=["midweek", "weekend"],
    ),
    date: Optional[date] = Query(
        None,
        description="Filter by meeting date (YYYY-MM-DD)",
        examples=["2026-11-18"],
    ),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=100, description="Pagination page limit"),
    db: Session = Depends(get_db),
) -> List[MeetingResponse]:
    meetings = crud.list_meetings(
        db,
        meeting_type=meeting_type,
        meeting_date=date,
        skip=skip,
        limit=limit,
    )

    results = []
    for m in meetings:
        res = MeetingResponse.model_validate(m)
        res.question_count = len(m.questions)
        results.append(res)
    return results


@router.get(
    "/{meeting_id}",
    response_model=MeetingDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Meeting by ID",
    description="Retrieve detailed meeting information including all attached questions in sequential order.",
)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
) -> MeetingDetailResponse:
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise EntityNotFoundException(f"Meeting with ID '{meeting_id}' not found.")

    res = MeetingDetailResponse.model_validate(meeting)
    res.question_count = len(meeting.questions)
    return res


@router.put(
    "/{meeting_id}",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Meeting",
    description="Update meeting details such as title, description, date, or type.",
)
def update_meeting(
    meeting_id: str,
    meeting_in: MeetingUpdate,
    db: Session = Depends(get_db),
) -> MeetingResponse:
    meeting = crud.update_meeting(db, meeting_id, meeting_in)
    if not meeting:
        raise EntityNotFoundException(f"Meeting with ID '{meeting_id}' not found.")

    res = MeetingResponse.model_validate(meeting)
    res.question_count = len(meeting.questions)
    return res


@router.delete(
    "/{meeting_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Meeting",
    description="Delete a meeting and automatically cascade delete all associated questions and answers.",
)
def delete_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
):
    deleted = crud.delete_meeting(db, meeting_id)
    if not deleted:
        raise EntityNotFoundException(f"Meeting with ID '{meeting_id}' not found.")

    return {
        "success": True,
        "message": f"Meeting '{meeting_id}' and all associated questions have been deleted.",
    }
