"""
Phase 8: React Native Expo Frontend Integration Tests
Tests all backend API endpoints and data contracts consumed by the mobile application.
"""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module", autouse=True)
def seed_phase8_knowledge(client: TestClient):
    """
    Ensure knowledge base has relevant reference material for integration tests.
    """
    client.post(
        "/api/v1/knowledge/ingest-text",
        json={
            "title": "சங்கீதம் 119:105 ஆய்வு",
            "content": (
                "சங்கீதம் 119:105 விளக்குவதுபோல, கடவுளுடைய வார்த்தை நம்முடைய கால்களுக்கு தீபமாகவும், "
                "நமது பாதைக்கு வெளிச்சமாகவும் இருக்கிறது. காரிருளில் கைவிளக்கு உடனடி பாதையைக் காட்டுவதுபோல "
                "வேதாகமத்தின் நியமங்கள் நமது அன்றாட தீர்மானங்களுக்கு பாதுகாப்பளிக்கின்றன."
            ),
            "source_type": "watchtower",
            "source_url": "https://www.jw.org/ta/library/bible-psalm-119/",
            "language": "ta",
        },
    )


def test_frontend_health_probe(client: TestClient):
    """
    Tests the health check endpoint used by the React Native settings screen
    to verify connectivity with the Tailscale node.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "jw-meetingmate-backend"
    assert "version" in data


def test_frontend_meeting_retrieval(client: TestClient):
    """
    Tests listing meetings and meeting details for HomeScreen, MidweekMeetingScreen,
    and WeekendMeetingScreen.
    """
    # 1. Create a midweek meeting
    mid_res = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "midweek",
            "meeting_date": datetime.now(timezone.utc).isoformat(),
            "title": "நடுவாரக் கூட்டம் — வாழ்க்கை மற்றும் ஊழியம்",
            "description": "லேவியராகமம் 1-4 பைபிள் வாசிப்பு",
        },
    )
    assert mid_res.status_code == 201
    midweek_id = mid_res.json()["id"]

    # 2. Create a weekend meeting
    wk_res = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "weekend",
            "meeting_date": datetime.now(timezone.utc).isoformat(),
            "title": "காவற்கோபுர படிப்பு — மார்ச் 2026",
            "description": "யெகோவாவின் அன்பான வழிகாட்டுதல்",
        },
    )
    assert wk_res.status_code == 201
    weekend_id = wk_res.json()["id"]

    # 3. List all meetings
    res = client.get("/api/v1/meetings")
    assert res.status_code == 200
    meetings = res.json()
    assert len(meetings) >= 2

    # 4. Filter by midweek
    res_mid = client.get("/api/v1/meetings?meeting_type=midweek")
    assert res_mid.status_code == 200
    mid_items = res_mid.json()
    assert all(m["meeting_type"] == "midweek" for m in mid_items)

    # 5. Filter by weekend
    res_wk = client.get("/api/v1/meetings?meeting_type=weekend")
    assert res_wk.status_code == 200
    wk_items = res_wk.json()
    assert all(m["meeting_type"] == "weekend" for m in wk_items)

    # 6. Get meeting detail by ID
    res_detail = client.get(f"/api/v1/meetings/{midweek_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == midweek_id
    assert "questions" in detail


def test_frontend_question_retrieval(client: TestClient):
    """
    Tests question retrieval for QuestionDetailScreen and SectionDetailScreen.
    """
    # Create meeting
    m_res = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "midweek",
            "meeting_date": datetime.now(timezone.utc).isoformat(),
            "title": "ஆய்வுக் கூட்டம்",
        },
    )
    meeting_id = m_res.json()["id"]

    # Add questions
    q_res = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={
            "section": "treasures",
            "question_text": "லேவியராகமம் 1:3 நமக்கு எதை கற்பிக்கிறது?",
            "paragraph_reference": "பாரா 2",
            "display_order": 0,
        },
    )
    assert q_res.status_code == 201
    q_id = q_res.json()["id"]

    # 1. Get meeting questions
    res_mq = client.get(f"/api/v1/meetings/{meeting_id}/questions")
    assert res_mq.status_code == 200
    questions = res_mq.json()
    assert len(questions) >= 1
    assert any(q["id"] == q_id for q in questions)

    # 2. Get single question by ID
    res_q = client.get(f"/api/v1/questions/{q_id}")
    assert res_q.status_code == 200
    q_data = res_q.json()
    assert q_data["id"] == q_id
    assert q_data["question_text"] == "லேவியராகமம் 1:3 நமக்கு எதை கற்பிக்கிறது?"


def test_frontend_ai_answer_generation(client: TestClient):
    """
    Tests generating answers for specific meeting questions (AnswerDetailScreen).
    """
    # Create meeting & question
    m_res = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "weekend",
            "meeting_date": datetime.now(timezone.utc).isoformat(),
            "title": "காவற்கோபுரம்",
        },
    )
    meeting_id = m_res.json()["id"]

    q_res = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={
            "section": "watchtower",
            "question_text": "சங்கீதம் 119:105 குறிப்பிடும் வெளிச்சம் என்பதன் அர்த்தம் என்ன?",
            "paragraph_reference": "பாரா 4",
            "display_order": 0,
        },
    )
    q_id = q_res.json()["id"]

    # Generate answer for question
    res = client.post(
        f"/api/v1/answers/generate-for-question/{q_id}?answer_type=short&save_answer=true"
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
    assert "sources" in data
    assert data["answer_type"] == "short"


def test_frontend_independent_question_pipeline(client: TestClient):
    """
    Tests independent question asking from HomeScreen / Search Modal.
    """
    res = client.post(
        "/api/v1/answers/independent",
        json={
            "question": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
            "answer_type": "detailed",
            "language": "ta",
            "save_to_history": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert data["answer_type"] == "detailed"


def test_frontend_saved_answers_sync_lifecycle(client: TestClient):
    """
    Tests saved answers CRUD for SavedAnswersScreen.
    """
    # 1. Create saved answer
    create_res = client.post(
        "/api/v1/saved-answers",
        json={
            "custom_title": "குடும்ப படிப்பு குறிப்பு",
            "answer_text": "முழு இருதயத்தோடு யெகோவாவை சேவிக்க வேண்டும்.",
            "notes": "சபை கூட்டத்தில் சொல்ல வேண்டிய தயாரிப்பு",
            "answer_type": "short",
        },
    )
    assert create_res.status_code == 201
    created = create_res.json()
    saved_id = created["id"]
    assert created["custom_title"] == "குடும்ப படிப்பு குறிப்பு"

    # 2. List saved answers
    list_res = client.get("/api/v1/saved-answers")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(item["id"] == saved_id for item in items)

    # 3. Update saved answer
    update_res = client.put(
        f"/api/v1/saved-answers/{saved_id}",
        json={
            "custom_title": "திருத்தப்பட்ட தலைப்பு",
            "notes": "கூடுதல் வேத வசன குறிப்புகள்",
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["custom_title"] == "திருத்தப்பட்ட தலைப்பு"
    assert updated["notes"] == "கூடுதல் வேத வசன குறிப்புகள்"

    # 4. Delete saved answer
    del_res = client.delete(f"/api/v1/saved-answers/{saved_id}")
    assert del_res.status_code == 200

    # 5. Verify 404
    verify_res = client.get(f"/api/v1/saved-answers/{saved_id}")
    assert verify_res.status_code == 404


def test_frontend_search_history_management(client: TestClient):
    """
    Tests search history retrieval and clearing for the History Tab in SavedAnswersScreen.
    """
    # Generate question to populate history
    client.post(
        "/api/v1/answers/independent",
        json={
            "question": "விசுவாசம் எவ்வாறு பலப்படுகிறது?",
            "answer_type": "short",
            "save_to_history": True,
        },
    )

    # List history
    hist_res = client.get("/api/v1/history?limit=10")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) > 0

    item_id = history[0]["id"]
    # Single delete
    single_del = client.delete(f"/api/v1/history/{item_id}")
    assert single_del.status_code == 200

    # Clear all history
    clear_res = client.delete("/api/v1/history")
    assert clear_res.status_code == 200
    assert "deleted" in clear_res.json()["detail"].lower()


def test_frontend_semantic_knowledge_search(client: TestClient):
    """
    Tests semantic vector search for the Knowledge Tab in SavedAnswersScreen.
    """
    res = client.post(
        "/api/v1/search",
        json={
            "query": "கடவுளின் அன்பு மற்றும் கருணை",
            "top_k": 3,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["query"] == "கடவுளின் அன்பு மற்றும் கருணை"
    assert "results" in data
    assert "total_results" in data
