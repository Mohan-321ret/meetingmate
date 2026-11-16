from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.exceptions import EntityNotFoundException, ValidationException
from app.database import crud
from app.database.connection import get_db
from app.schemas.meeting import (
    CurrentWeekMeetingsResponse,
    JWMeetingSyncResponse,
    MeetingCreate,
    MeetingDetailResponse,
    MeetingResponse,
    MeetingUpdate,
)
from app.services.jw_scraper import calculate_meeting_week, get_jw_scraper_service

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


@router.post(
    "/sync-jw",
    response_model=JWMeetingSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Sync Meetings from JW.org",
    description="Automatically scrapes or imports the current or specified week's Midweek & Weekend meetings and questions from jw.org, saves to SQLite, and vectorizes lesson text into ChromaDB.",
)
async def sync_jw_meetings(
    target_date: Optional[date] = Query(
        None,
        description="Target reference date (defaults to today; automatically maps to the corresponding Monday-Sunday week)",
    ),
    language: str = Query("ta", description="Language code ('ta' for Tamil, 'en' for English)"),
    force_refresh: bool = Query(
        False, description="Whether to overwrite existing meeting data for this week"
    ),
    db: Session = Depends(get_db),
) -> JWMeetingSyncResponse:
    if language not in ("ta", "en"):
        raise ValidationException("Language must be 'ta' (Tamil) or 'en' (English).")

    scraper = get_jw_scraper_service()
    result = await scraper.sync_week_meetings(
        db=db,
        ref_date=target_date,
        language=language,
        force_refresh=force_refresh,
    )

    midweek_res = None
    if result.get("midweek_meeting"):
        m = result["midweek_meeting"]
        midweek_res = MeetingResponse.model_validate(m)
        midweek_res.question_count = len(m.questions)

    weekend_res = None
    if result.get("weekend_meeting"):
        m = result["weekend_meeting"]
        weekend_res = MeetingResponse.model_validate(m)
        weekend_res.question_count = len(m.questions)

    return JWMeetingSyncResponse(
        success=result["success"],
        week_label=result["week_label"],
        target_date=result["target_date"],
        midweek_meeting=midweek_res,
        weekend_meeting=weekend_res,
        total_questions_created=result["total_questions_created"],
        chroma_chunks_indexed=result["chroma_chunks_indexed"],
        source_urls=result["source_urls"],
        message=result["message"],
    )


@router.get(
    "/current-week",
    response_model=CurrentWeekMeetingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Week Meetings",
    description="Retrieve the active Midweek and Weekend meetings and all questions for the current week, automatically syncing from JW.org if not yet present in the local database.",
)
async def get_current_week_meetings(
    language: str = Query("ta", description="Language code ('ta' or 'en')"),
    auto_sync: bool = Query(
        True, description="Automatically sync meetings from JW.org if missing from database"
    ),
    db: Session = Depends(get_db),
) -> CurrentWeekMeetingsResponse:
    if language not in ("ta", "en"):
        raise ValidationException("Language must be 'ta' (Tamil) or 'en' (English).")

    monday_dt, midweek_dt, weekend_dt, week_label_ta, week_label_en = calculate_meeting_week()
    week_label = week_label_ta if language == "ta" else week_label_en

    # Check database for meetings for this week
    midweek_meetings = crud.get_meetings_by_date(db, midweek_dt.date())
    midweek = next((m for m in midweek_meetings if m.meeting_type == "midweek"), None)

    weekend_meetings = crud.get_meetings_by_date(db, weekend_dt.date())
    weekend = next((m for m in weekend_meetings if m.meeting_type == "weekend"), None)

    # Auto-sync if either is missing and auto_sync is enabled
    if (not midweek or not weekend) and auto_sync:
        scraper = get_jw_scraper_service()
        sync_res = await scraper.sync_week_meetings(db=db, language=language, force_refresh=False)
        midweek = sync_res.get("midweek_meeting") or midweek
        weekend = sync_res.get("weekend_meeting") or weekend

    midweek_detail = None
    if midweek:
        midweek_detail = MeetingDetailResponse.model_validate(midweek)
        midweek_detail.question_count = len(midweek.questions)

    weekend_detail = None
    if weekend:
        weekend_detail = MeetingDetailResponse.model_validate(weekend)
        weekend_detail.question_count = len(weekend.questions)

    sunday_dt = monday_dt + timedelta(days=6)

    return CurrentWeekMeetingsResponse(
        week_label=week_label,
        start_date=monday_dt.date().isoformat(),
        end_date=sunday_dt.date().isoformat(),
        midweek=midweek_detail,
        weekend=weekend_detail,
    )


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
