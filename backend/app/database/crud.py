from datetime import date, datetime, time, timezone
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import (
    Answer,
    KnowledgeDocument,
    Meeting,
    Question,
    SavedAnswer,
    SearchHistory,
)
from app.schemas import (
    AnswerCreate,
    AnswerUpdate,
    KnowledgeDocumentCreate,
    KnowledgeDocumentUpdate,
    MeetingCreate,
    MeetingUpdate,
    QuestionCreate,
    QuestionReorderItem,
    QuestionUpdate,
    SavedAnswerCreate,
    SavedAnswerUpdate,
    SearchHistoryCreate,
)


# ==============================================================================
# MEETINGS CRUD
# ==============================================================================

def create_meeting(db: Session, meeting_in: MeetingCreate) -> Meeting:
    db_meeting = Meeting(
        meeting_type=meeting_in.meeting_type,
        meeting_date=meeting_in.meeting_date,
        title=meeting_in.title,
        description=meeting_in.description,
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


def get_meeting(db: Session, meeting_id: str) -> Optional[Meeting]:
    return db.query(Meeting).filter(Meeting.id == meeting_id).first()


def list_meetings(
    db: Session,
    meeting_type: Optional[str] = None,
    meeting_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Meeting]:
    query = db.query(Meeting)
    if meeting_type:
        query = query.filter(Meeting.meeting_type == meeting_type)
    if meeting_date:
        start_of_day = datetime.combine(meeting_date, time.min).replace(tzinfo=timezone.utc)
        end_of_day = datetime.combine(meeting_date, time.max).replace(tzinfo=timezone.utc)
        query = query.filter(Meeting.meeting_date >= start_of_day, Meeting.meeting_date <= end_of_day)
    return query.order_by(Meeting.meeting_date.desc()).offset(skip).limit(limit).all()


def get_meetings_by_date(db: Session, meeting_date: date) -> List[Meeting]:
    return list_meetings(db, meeting_date=meeting_date, limit=100)


def update_meeting(
    db: Session, meeting_id: str, meeting_in: MeetingUpdate
) -> Optional[Meeting]:
    db_meeting = get_meeting(db, meeting_id)
    if not db_meeting:
        return None

    update_data = meeting_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_meeting, field, value)

    db.commit()
    db.refresh(db_meeting)
    return db_meeting


def delete_meeting(db: Session, meeting_id: str) -> bool:
    db_meeting = get_meeting(db, meeting_id)
    if not db_meeting:
        return False
    db.delete(db_meeting)
    db.commit()
    return True


# ==============================================================================
# QUESTIONS CRUD
# ==============================================================================

def create_question(db: Session, question_in: QuestionCreate) -> Question:
    db_question = Question(
        meeting_id=question_in.meeting_id,
        section=question_in.section,
        question_text=question_in.question_text,
        paragraph_reference=question_in.paragraph_reference,
        display_order=question_in.display_order,
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


def get_question(db: Session, question_id: str) -> Optional[Question]:
    return db.query(Question).filter(Question.id == question_id).first()


def list_questions_by_meeting(
    db: Session, meeting_id: str, section: Optional[str] = None
) -> List[Question]:
    query = db.query(Question).filter(Question.meeting_id == meeting_id)
    if section:
        query = query.filter(Question.section == section)
    return query.order_by(Question.display_order.asc(), Question.created_at.asc()).all()


def update_question(
    db: Session, question_id: str, question_in: QuestionUpdate
) -> Optional[Question]:
    db_question = get_question(db, question_id)
    if not db_question:
        return None

    update_data = question_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_question, field, value)

    db.commit()
    db.refresh(db_question)
    return db_question


def delete_question(db: Session, question_id: str) -> bool:
    db_question = get_question(db, question_id)
    if not db_question:
        return False
    db.delete(db_question)
    db.commit()
    return True


def get_next_question_display_order(db: Session, meeting_id: str) -> int:
    max_order = (
        db.query(func.max(Question.display_order))
        .filter(Question.meeting_id == meeting_id)
        .scalar()
    )
    return (max_order or 0) + 1


def reorder_questions(
    db: Session, meeting_id: str, items: List[QuestionReorderItem]
) -> List[Question]:
    id_to_order = {item.id: item.display_order for item in items}
    questions = (
        db.query(Question)
        .filter(
            Question.meeting_id == meeting_id,
            Question.id.in_(list(id_to_order.keys())),
        )
        .all()
    )

    for q in questions:
        q.display_order = id_to_order[q.id]

    db.commit()
    return list_questions_by_meeting(db, meeting_id)


# ==============================================================================
# ANSWERS CRUD
# ==============================================================================

def create_answer(db: Session, answer_in: AnswerCreate) -> Answer:
    db_answer = Answer(
        question_id=answer_in.question_id,
        answer_text=answer_in.answer_text,
        answer_type=answer_in.answer_type,
        sources_json=getattr(answer_in, "sources_json", None),
    )
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)
    return db_answer


def get_answer(db: Session, answer_id: str) -> Optional[Answer]:
    return db.query(Answer).filter(Answer.id == answer_id).first()


def list_answers_by_question(
    db: Session, question_id: str
) -> List[Answer]:
    return (
        db.query(Answer)
        .filter(Answer.question_id == question_id)
        .order_by(Answer.created_at.asc())
        .all()
    )


def update_answer(
    db: Session, answer_id: str, answer_in: AnswerUpdate
) -> Optional[Answer]:
    db_answer = get_answer(db, answer_id)
    if not db_answer:
        return None

    update_data = answer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_answer, field, value)

    db.commit()
    db.refresh(db_answer)
    return db_answer


def delete_answer(db: Session, answer_id: str) -> bool:
    db_answer = get_answer(db, answer_id)
    if not db_answer:
        return False
    db.delete(db_answer)
    db.commit()
    return True


# ==============================================================================
# KNOWLEDGE DOCUMENTS CRUD
# ==============================================================================

def create_knowledge_document(
    db: Session, doc_in: KnowledgeDocumentCreate
) -> KnowledgeDocument:
    db_doc = KnowledgeDocument(
        title=doc_in.title,
        source_type=doc_in.source_type,
        source_url=doc_in.source_url,
        language=doc_in.language,
        document_status=doc_in.document_status,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc


def get_knowledge_document(
    db: Session, doc_id: str
) -> Optional[KnowledgeDocument]:
    return db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()


def list_knowledge_documents(
    db: Session,
    source_type: Optional[str] = None,
    document_status: Optional[str] = None,
    language: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[KnowledgeDocument]:
    query = db.query(KnowledgeDocument)
    if source_type:
        query = query.filter(KnowledgeDocument.source_type == source_type)
    if document_status:
        query = query.filter(KnowledgeDocument.document_status == document_status)
    if language:
        query = query.filter(KnowledgeDocument.language == language)
    return query.order_by(KnowledgeDocument.created_at.desc()).offset(skip).limit(limit).all()


def count_knowledge_documents(
    db: Session,
    source_type: Optional[str] = None,
    document_status: Optional[str] = None,
    language: Optional[str] = None,
) -> int:
    query = db.query(func.count(KnowledgeDocument.id))
    if source_type:
        query = query.filter(KnowledgeDocument.source_type == source_type)
    if document_status:
        query = query.filter(KnowledgeDocument.document_status == document_status)
    if language:
        query = query.filter(KnowledgeDocument.language == language)
    return query.scalar() or 0


def find_knowledge_document_by_title_or_url(
    db: Session, title: str, source_url: Optional[str] = None
) -> Optional[KnowledgeDocument]:
    query = db.query(KnowledgeDocument).filter(KnowledgeDocument.title == title)
    match = query.first()
    if match:
        return match
    if source_url and source_url.strip():
        return db.query(KnowledgeDocument).filter(KnowledgeDocument.source_url == source_url.strip()).first()
    return None


def update_knowledge_document(
    db: Session, doc_id: str, doc_in: KnowledgeDocumentUpdate
) -> Optional[KnowledgeDocument]:
    db_doc = get_knowledge_document(db, doc_id)
    if not db_doc:
        return None

    update_data = doc_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_doc, field, value)

    db.commit()
    db.refresh(db_doc)
    return db_doc


def delete_knowledge_document(db: Session, doc_id: str) -> bool:
    db_doc = get_knowledge_document(db, doc_id)
    if not db_doc:
        return False
    db.delete(db_doc)
    db.commit()
    return True


# ==============================================================================
# SEARCH HISTORY CRUD
# ==============================================================================

def create_search_history(
    db: Session, search_in: SearchHistoryCreate
) -> SearchHistory:
    db_search = SearchHistory(
        query=search_in.query,
        answer=search_in.answer,
        answer_type=getattr(search_in, "answer_type", "short") or "short",
        sources_json=getattr(search_in, "sources_json", None),
    )
    db.add(db_search)
    db.commit()
    db.refresh(db_search)
    return db_search


def get_search_history(db: Session, history_id: str) -> Optional[SearchHistory]:
    return db.query(SearchHistory).filter(SearchHistory.id == history_id).first()


def list_search_history(
    db: Session, skip: int = 0, limit: int = 50
) -> List[SearchHistory]:
    return (
        db.query(SearchHistory)
        .order_by(SearchHistory.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def delete_search_history(db: Session, search_id: str) -> bool:
    db_search = get_search_history(db, search_id)
    if not db_search:
        return False
    db.delete(db_search)
    db.commit()
    return True


def clear_search_history(db: Session) -> int:
    deleted_count = db.query(SearchHistory).delete()
    db.commit()
    return deleted_count


# ==============================================================================
# SAVED ANSWERS CRUD
# ==============================================================================

def create_saved_answer(
    db: Session, saved_in: SavedAnswerCreate
) -> SavedAnswer:
    answer_id = saved_in.answer_id

    # If answer_id is not given, but answer_text is provided, create the Answer record first
    if not answer_id and saved_in.answer_text:
        db_answer = Answer(
            question_id=saved_in.question_id,
            answer_text=saved_in.answer_text,
            answer_type=saved_in.answer_type or "short",
        )
        db.add(db_answer)
        db.commit()
        db.refresh(db_answer)
        answer_id = db_answer.id
    elif not answer_id:
        raise ValueError("Either 'answer_id' or 'answer_text' must be provided to save an answer.")

    db_saved = SavedAnswer(
        answer_id=answer_id,
        custom_title=saved_in.custom_title,
        notes=saved_in.notes,
    )
    db.add(db_saved)
    db.commit()
    db.refresh(db_saved)
    return db_saved


def get_saved_answer(db: Session, saved_id: str) -> Optional[SavedAnswer]:
    return db.query(SavedAnswer).filter(SavedAnswer.id == saved_id).first()


def list_saved_answers(
    db: Session,
    question_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[SavedAnswer]:
    query = db.query(SavedAnswer)
    if question_id:
        query = query.join(Answer).filter(Answer.question_id == question_id)
    return query.order_by(SavedAnswer.created_at.desc()).offset(skip).limit(limit).all()


def update_saved_answer(
    db: Session, saved_id: str, saved_in: SavedAnswerUpdate
) -> Optional[SavedAnswer]:
    db_saved = get_saved_answer(db, saved_id)
    if not db_saved:
        return None

    if saved_in.custom_title is not None:
        db_saved.custom_title = saved_in.custom_title
    if saved_in.notes is not None:
        db_saved.notes = saved_in.notes

    # Update associated answer text or type if provided
    if (saved_in.answer_text is not None or saved_in.answer_type is not None) and db_saved.answer:
        if saved_in.answer_text is not None:
            db_saved.answer.answer_text = saved_in.answer_text
        if saved_in.answer_type is not None:
            db_saved.answer.answer_type = saved_in.answer_type

    db.commit()
    db.refresh(db_saved)
    return db_saved


def delete_saved_answer(db: Session, saved_id: str) -> bool:
    db_saved = get_saved_answer(db, saved_id)
    if not db_saved:
        return False
    db.delete(db_saved)
    db.commit()
    return True
