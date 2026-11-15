from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from app.schemas import (
    AnswerCreate,
    KnowledgeDocumentCreate,
    MeetingCreate,
    QuestionCreate,
    SavedAnswerCreate,
    SearchHistoryCreate,
)


def test_meeting_schema_validation():
    # Valid midweek meeting
    valid_meeting = MeetingCreate(
        meeting_type="midweek",
        meeting_date=datetime.now(timezone.utc),
        title="Midweek Meeting",
    )
    assert valid_meeting.meeting_type == "midweek"

    # Valid weekend meeting (case-insensitive conversion)
    weekend_meeting = MeetingCreate(
        meeting_type="WEEKEND",
        meeting_date=datetime.now(timezone.utc),
        title="Weekend Meeting",
    )
    assert weekend_meeting.meeting_type == "weekend"

    # Invalid meeting type
    with pytest.raises(ValidationError):
        MeetingCreate(
            meeting_type="invalid_type",
            meeting_date=datetime.now(timezone.utc),
            title="Invalid",
        )


def test_answer_schema_validation():
    # Valid answer types
    valid_ans = AnswerCreate(
        answer_text="This is an answer",
        answer_type="short",
    )
    assert valid_ans.answer_type == "short"

    # Invalid answer type
    with pytest.raises(ValidationError):
        AnswerCreate(
            answer_text="Test",
            answer_type="unsupported_type",
        )


def test_knowledge_document_schema_validation():
    # Valid document
    doc = KnowledgeDocumentCreate(
        title="Watchtower Study Article",
        source_type="watchtower",
        document_status="indexed",
    )
    assert doc.source_type == "watchtower"
    assert doc.document_status == "indexed"

    # Invalid source type
    with pytest.raises(ValidationError):
        KnowledgeDocumentCreate(
            title="Doc",
            source_type="non_existent_source",
        )

    # Invalid document status
    with pytest.raises(ValidationError):
        KnowledgeDocumentCreate(
            title="Doc",
            source_type="watchtower",
            document_status="invalid_status",
        )
