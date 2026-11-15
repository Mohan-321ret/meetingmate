from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal, init_db
from app.database import crud
from app.schemas import (
    AnswerCreate,
    AnswerUpdate,
    KnowledgeDocumentCreate,
    KnowledgeDocumentUpdate,
    MeetingCreate,
    MeetingUpdate,
    QuestionCreate,
    QuestionUpdate,
    SavedAnswerCreate,
    SavedAnswerUpdate,
    SearchHistoryCreate,
)


@pytest.fixture
def db_session():
    """
    Provide a fresh transactional session for test execution, ensuring tables are initialized.
    """
    init_db()
    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


# ==============================================================================
# 1. MEETINGS CRUD TESTS
# ==============================================================================

def test_meeting_lifecycle(db_session: Session):
    # 1. Create Midweek Meeting
    midweek_in = MeetingCreate(
        meeting_type="midweek",
        meeting_date=datetime(2026, 11, 18, 19, 0, tzinfo=timezone.utc),
        title="கிறிஸ்தவ வாழ்க்கையும் ஊழியமும்",
        description="நடுவாரக் கூட்டம் - லேவியராகமம் 1-4",
    )
    meeting = crud.create_meeting(db_session, midweek_in)
    assert meeting.id is not None
    assert meeting.meeting_type == "midweek"
    assert meeting.title == "கிறிஸ்தவ வாழ்க்கையும் ஊழியமும்"

    # 2. Read Meeting
    fetched = crud.get_meeting(db_session, meeting.id)
    assert fetched is not None
    assert fetched.id == meeting.id
    assert fetched.description == "நடுவாரக் கூட்டம் - லேவியராகமம் 1-4"

    # 3. Create Weekend Meeting
    weekend_in = MeetingCreate(
        meeting_type="weekend",
        meeting_date=datetime(2026, 11, 22, 10, 0, tzinfo=timezone.utc),
        title="வார இறுதி கூட்டம் - பொதுப் பேச்சு & காவற்கோபுரம்",
    )
    weekend_meeting = crud.create_meeting(db_session, weekend_in)
    assert weekend_meeting.id is not None

    # 4. List and Filter
    all_meetings = crud.list_meetings(db_session)
    assert len(all_meetings) >= 2

    midweek_list = crud.list_meetings(db_session, meeting_type="midweek")
    assert all(m.meeting_type == "midweek" for m in midweek_list)

    # 5. Update Meeting
    updated = crud.update_meeting(
        db_session,
        meeting.id,
        MeetingUpdate(title="புதுப்பிக்கப்பட்ட நடுவாரக் கூட்டம்", description="விளக்கம் திருத்தப்பட்டது"),
    )
    assert updated is not None
    assert updated.title == "புதுப்பிக்கப்பட்ட நடுவாரக் கூட்டம்"
    assert updated.description == "விளக்கம் திருத்தப்பட்டது"

    # 6. Delete Meeting
    success = crud.delete_meeting(db_session, weekend_meeting.id)
    assert success is True
    assert crud.get_meeting(db_session, weekend_meeting.id) is None


# ==============================================================================
# 2. QUESTIONS CRUD TESTS
# ==============================================================================

def test_question_lifecycle(db_session: Session):
    meeting = crud.create_meeting(
        db_session,
        MeetingCreate(
            meeting_type="midweek",
            meeting_date=datetime.now(timezone.utc),
            title="புதையல்கள் கேள்வி கூட்டம்",
        ),
    )

    # 1. Create Question
    q_in = QuestionCreate(
        meeting_id=meeting.id,
        section="treasures",
        question_text="லேவியராகமம் 1:3-ல் இருந்து நாம் என்ன கற்றுக்கொள்ளலாம்?",
        paragraph_reference="பாரா 2",
        display_order=1,
    )
    q1 = crud.create_question(db_session, q_in)
    assert q1.id is not None
    assert q1.meeting_id == meeting.id
    assert q1.section == "treasures"

    # 2. Create Second Question
    q2 = crud.create_question(
        db_session,
        QuestionCreate(
            meeting_id=meeting.id,
            section="ministry",
            question_text="மறுசந்திப்பு உரையாடலை எவ்வாறு தொடங்கலாம்?",
            display_order=2,
        ),
    )

    # 3. Read & List by Meeting and Section
    questions = crud.list_questions_by_meeting(db_session, meeting.id)
    assert len(questions) == 2
    assert questions[0].display_order == 1
    assert questions[1].display_order == 2

    treasures_only = crud.list_questions_by_meeting(db_session, meeting.id, section="treasures")
    assert len(treasures_only) == 1
    assert treasures_only[0].id == q1.id

    # 4. Update Question
    updated_q = crud.update_question(
        db_session,
        q1.id,
        QuestionUpdate(question_text="திருத்தப்பட்ட கேள்வி விளக்கம்?", display_order=5),
    )
    assert updated_q.question_text == "திருத்தப்பட்ட கேள்வி விளக்கம்?"
    assert updated_q.display_order == 5

    # 5. Delete Question
    deleted = crud.delete_question(db_session, q2.id)
    assert deleted is True
    assert crud.get_question(db_session, q2.id) is None


# ==============================================================================
# 3. ANSWERS CRUD TESTS
# ==============================================================================

def test_answer_lifecycle(db_session: Session):
    meeting = crud.create_meeting(
        db_session,
        MeetingCreate(
            meeting_type="weekend",
            meeting_date=datetime.now(timezone.utc),
            title="காவற்கோபுர படிப்பு",
        ),
    )
    question = crud.create_question(
        db_session,
        QuestionCreate(
            meeting_id=meeting.id,
            section="watchtower",
            question_text="யெகோவாவின் அன்பை எவ்வாறு வெளிப்படுத்தலாம்?",
        ),
    )

    # 1. Create Answer Linked to Question
    ans1 = crud.create_answer(
        db_session,
        AnswerCreate(
            question_id=question.id,
            answer_text="பிறர் மீது உண்மையான கரிசனை காட்டுவதன் மூலம் யெகோவாவின் அன்பை பிரதிபலிக்கிறோம்.",
            answer_type="short",
        ),
    )
    assert ans1.id is not None
    assert ans1.question_id == question.id
    assert ans1.answer_type == "short"

    # 2. Create Independent Answer (question_id is None)
    independent_ans = crud.create_answer(
        db_session,
        AnswerCreate(
            question_id=None,
            answer_text="பொதுவான தியானக் குறிப்பு: 1 கொரிந்தியர் 13:4-8",
            answer_type="scripture_focused",
        ),
    )
    assert independent_ans.id is not None
    assert independent_ans.question_id is None

    # 3. List Answers by Question
    q_answers = crud.list_answers_by_question(db_session, question.id)
    assert len(q_answers) == 1
    assert q_answers[0].id == ans1.id

    # 4. Update Answer
    updated_ans = crud.update_answer(
        db_session,
        ans1.id,
        AnswerUpdate(answer_type="detailed", answer_text="விரிவான பதில் குறிப்பு சேர்க்கப்பட்டது."),
    )
    assert updated_ans.answer_type == "detailed"
    assert updated_ans.answer_text == "விரிவான பதில் குறிப்பு சேர்க்கப்பட்டது."

    # 5. Delete Answer
    assert crud.delete_answer(db_session, independent_ans.id) is True
    assert crud.get_answer(db_session, independent_ans.id) is None


# ==============================================================================
# 4. KNOWLEDGE DOCUMENTS CRUD TESTS
# ==============================================================================

def test_knowledge_document_lifecycle(db_session: Session):
    # 1. Create Knowledge Document
    doc = crud.create_knowledge_document(
        db_session,
        KnowledgeDocumentCreate(
            title="காவற்கோபுரம் மார்ச் 2026",
            source_type="watchtower",
            source_url="https://wol.jw.org/ta/wol/d/r153/lp-t/w26.03",
            language="ta",
            document_status="pending",
        ),
    )
    assert doc.id is not None
    assert doc.title == "காவற்கோபுரம் மார்ச் 2026"
    assert doc.document_status == "pending"

    # 2. List & Filter
    docs = crud.list_knowledge_documents(db_session, source_type="watchtower")
    assert len(docs) >= 1
    assert docs[0].source_type == "watchtower"

    # 3. Update Status
    updated_doc = crud.update_knowledge_document(
        db_session,
        doc.id,
        KnowledgeDocumentUpdate(document_status="indexed"),
    )
    assert updated_doc.document_status == "indexed"

    # 4. Delete Document
    assert crud.delete_knowledge_document(db_session, doc.id) is True
    assert crud.get_knowledge_document(db_session, doc.id) is None


# ==============================================================================
# 5. SEARCH HISTORY CRUD TESTS
# ==============================================================================

def test_search_history_lifecycle(db_session: Session):
    # 1. Create Search Entry
    entry = crud.create_search_history(
        db_session,
        SearchHistoryCreate(
            query="யெகோவாவின் சாட்சிகள் யார்?",
            answer="யெகோவாவுக்கு சாட்சிகளாக இருக்கும் உலகளாவிய கிறிஸ்தவ சகோதரத்துவம்.",
        ),
    )
    assert entry.id is not None

    # 2. List
    history = crud.list_search_history(db_session, limit=10)
    assert len(history) >= 1
    assert any(h.id == entry.id for h in history)

    # 3. Delete
    assert crud.delete_search_history(db_session, entry.id) is True


# ==============================================================================
# 6. SAVED ANSWERS CRUD TESTS
# ==============================================================================

def test_saved_answers_lifecycle(db_session: Session):
    meeting = crud.create_meeting(
        db_session,
        MeetingCreate(
            meeting_type="midweek",
            meeting_date=datetime.now(timezone.utc),
            title="குடும்ப படிப்பு",
        ),
    )
    question = crud.create_question(
        db_session,
        QuestionCreate(meeting_id=meeting.id, section="living", question_text="குடும்பத்தில் அன்பு"),
    )
    answer = crud.create_answer(
        db_session,
        AnswerCreate(question_id=question.id, answer_text="குடும்பத்தில் ஒருவருக்கொருவர் விட்டுக் கொடுப்பது."),
    )

    # 1. Save Answer
    saved = crud.create_saved_answer(
        db_session,
        SavedAnswerCreate(
            answer_id=answer.id,
            custom_title="என் பதில் குறிப்பு",
            notes="கூட்டத்தில் முதல் ஆளாக கை தூக்க வேண்டும்.",
        ),
    )
    assert saved.id is not None
    assert saved.answer_id == answer.id
    assert saved.custom_title == "என் பதில் குறிப்பு"

    # 2. Read & List
    fetched = crud.get_saved_answer(db_session, saved.id)
    assert fetched is not None
    assert fetched.notes == "கூட்டத்தில் முதல் ஆளாக கை தூக்க வேண்டும்."

    all_saved = crud.list_saved_answers(db_session)
    assert len(all_saved) >= 1

    # 3. Update
    updated = crud.update_saved_answer(
        db_session,
        saved.id,
        SavedAnswerUpdate(custom_title="திருத்தப்பட்ட தலைப்பு"),
    )
    assert updated.custom_title == "திருத்தப்பட்ட தலைப்பு"


# ==============================================================================
# 7. CASCADING DELETION INTEGRITY TESTS
# ==============================================================================

def test_cascading_deletions(db_session: Session):
    """
    Verify SQLite foreign key cascading:
    Meeting -> Question -> Answer -> SavedAnswer
    Deleting Meeting must delete questions, answers, and saved answers.
    """
    # Create complete hierarchy
    meeting = crud.create_meeting(
        db_session,
        MeetingCreate(
            meeting_type="midweek",
            meeting_date=datetime.now(timezone.utc),
            title="Cascade Test Meeting",
        ),
    )
    question = crud.create_question(
        db_session,
        QuestionCreate(
            meeting_id=meeting.id,
            section="treasures",
            question_text="Cascade Test Question",
        ),
    )
    answer = crud.create_answer(
        db_session,
        AnswerCreate(
            question_id=question.id,
            answer_text="Cascade Test Answer",
        ),
    )
    saved = crud.create_saved_answer(
        db_session,
        SavedAnswerCreate(
            answer_id=answer.id,
            custom_title="Cascade Test Saved",
        ),
    )

    q_id = question.id
    a_id = answer.id
    s_id = saved.id

    # Verify all exist
    assert crud.get_meeting(db_session, meeting.id) is not None
    assert crud.get_question(db_session, q_id) is not None
    assert crud.get_answer(db_session, a_id) is not None
    assert crud.get_saved_answer(db_session, s_id) is not None

    # Delete Meeting -> Cascades down
    crud.delete_meeting(db_session, meeting.id)

    # Verify all children were deleted by cascade
    assert crud.get_meeting(db_session, meeting.id) is None
    assert crud.get_question(db_session, q_id) is None
    assert crud.get_answer(db_session, a_id) is None
    assert crud.get_saved_answer(db_session, s_id) is None
