import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module", autouse=True)
def seed_knowledge(client: TestClient):
    """
    Ensure knowledge base is seeded with reference material for RAG generation.
    """
    client.post(
        "/api/v1/knowledge/ingest-text",
        json={
            "title": "சுயாதீன கேள்விகள் மற்றும் விசுவாசம்",
            "content": (
                "விசுவாசம் என்பது காணப்படாத காரியங்களின் நிச்சயமான நம்பிக்கையாக இருக்கிறது. "
                "எபிரெயர் 11:1 விசுவாசத்தைப் பற்றி தெளிவாக விளக்குகிறது. "
                "நாம் சோதனைகளின் மத்தியில் கடவுளிடம் ஜெபிக்கும்போது, அவர் நமக்கு மன அமைதியையும் "
                "தாங்கும் பலத்தையும் நிச்சயம் தருவார்."
            ),
            "source_type": "watchtower",
            "source_url": "https://www.jw.org/ta/library/faith-and-trials/",
            "language": "ta",
        },
    )


# ==============================================================================
# 1. SAVED ANSWERS TESTS
# ==============================================================================

def test_saved_answers_lifecycle(client: TestClient):
    """
    Test creating, retrieving, updating, and deleting a saved answer.
    """
    # 1. Generate an answer first
    gen_res = client.post(
        "/api/v1/answers/generate",
        json={
            "question": "விசுவாசம் என்றால் என்ன?",
            "answer_type": "short",
            "save_answer": True,
        },
    )
    assert gen_res.status_code == 200
    answer_id = gen_res.json()["saved_answer_id"]
    assert answer_id is not None

    # 2. Save the answer with custom title and personal study notes
    save_payload = {
        "answer_id": answer_id,
        "custom_title": "என் சபை பதில் - எபிரெயர் 11:1",
        "notes": "கூட்டத்தில் பேசுவதற்கு முன் இந்த வசனத்தை மீண்டும் வாசிக்கவும்.",
    }
    save_res = client.post("/api/v1/saved-answers", json=save_payload)
    assert save_res.status_code == 201

    saved_data = save_res.json()
    saved_id = saved_data["id"]
    assert saved_data["answer_id"] == answer_id
    assert saved_data["custom_title"] == save_payload["custom_title"]
    assert saved_data["notes"] == save_payload["notes"]
    assert saved_data["answer_text"] is not None

    # 3. Retrieve all saved answers
    list_res = client.get("/api/v1/saved-answers")
    assert list_res.status_code == 200
    all_saved = list_res.json()
    assert isinstance(all_saved, list)
    assert any(item["id"] == saved_id for item in all_saved)

    # 4. Retrieve individual saved answer by ID
    get_res = client.get(f"/api/v1/saved-answers/{saved_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == saved_id

    # 5. Update saved answer (notes, title, and answer text)
    update_payload = {
        "custom_title": "புதுப்பிக்கப்பட்ட சபை பதில்",
        "notes": "கூடுதல் குறிப்பு: குரலை உயர்த்தி தெளிவாகப் பேசவும்.",
        "answer_text": "விசுவாசம் என்பது கடவுளின் வாக்குறுதிகள் நிறைவேறும் என்ற உறுதியான நம்பிக்கை.",
    }
    put_res = client.put(f"/api/v1/saved-answers/{saved_id}", json=update_payload)
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["custom_title"] == update_payload["custom_title"]
    assert updated_data["notes"] == update_payload["notes"]
    assert updated_data["answer_text"] == update_payload["answer_text"]

    # 6. Delete saved answer
    del_res = client.delete(f"/api/v1/saved-answers/{saved_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 7. Verify 404 after deletion
    verify_res = client.get(f"/api/v1/saved-answers/{saved_id}")
    assert verify_res.status_code == 404


def test_saved_answer_direct_creation_without_preexisting_id(client: TestClient):
    """
    Test directly saving an answer with answer_text and custom title
    without an explicit pre-existing answer_id.
    """
    payload = {
        "answer_text": "குடும்ப வழிபாட்டில் நாம் அனைவரும் உற்சாகமாகப் பங்கேற்க வேண்டும்.",
        "answer_type": "short",
        "custom_title": "குடும்ப வழிபாடு குறிப்பு",
        "notes": "வியாழக்கிழமை மாலை 7:00 மணிக்கு.",
    }
    response = client.post("/api/v1/saved-answers", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["answer_id"] is not None
    assert data["answer_text"] == payload["answer_text"]
    assert data["custom_title"] == payload["custom_title"]
    assert data["notes"] == payload["notes"]


def test_saved_answer_validation_error(client: TestClient):
    """
    Rejects payload missing both answer_id and answer_text.
    """
    response = client.post(
        "/api/v1/saved-answers",
        json={"custom_title": "No answer attached"},
    )
    assert response.status_code == 422


# ==============================================================================
# 2. SEARCH HISTORY TESTS
# ==============================================================================

def test_search_history_lifecycle(client: TestClient):
    """
    Test recording, listing, viewing, and clearing search history.
    """
    # 1. Ask a question to trigger auto-recording into history
    question = "விசுவாசத்தை எப்படி பலப்படுத்தலாம்?"
    gen_res = client.post(
        "/api/v1/answers/generate",
        json={
            "question": question,
            "answer_type": "short",
            "save_to_history": True,
        },
    )
    assert gen_res.status_code == 200

    # 2. List search history
    hist_res = client.get("/api/v1/history?limit=10")
    assert hist_res.status_code == 200
    histories = hist_res.json()
    assert len(histories) > 0

    latest = histories[0]
    assert latest["query"] == question
    assert "answer" in latest
    assert "created_at" in latest
    assert isinstance(latest["sources"], list)
    target_id = latest["id"]

    # 3. Retrieve individual history record
    single_res = client.get(f"/api/v1/history/{target_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == target_id
    assert single_res.json()["query"] == question

    # 4. Delete individual history record
    del_res = client.delete(f"/api/v1/history/{target_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted record is gone
    get_deleted = client.get(f"/api/v1/history/{target_id}")
    assert get_deleted.status_code == 404

    # 5. Clear entire search history
    clear_res = client.delete("/api/v1/history")
    assert clear_res.status_code == 200
    assert clear_res.json()["success"] is True

    # Verify history is empty
    empty_list = client.get("/api/v1/history")
    assert empty_list.status_code == 200
    assert len(empty_list.json()) == 0


# ==============================================================================
# 3. INDEPENDENT QUESTIONS TESTS
# ==============================================================================

def test_independent_question_generation(client: TestClient):
    """
    Test asking an independent question outside any meeting structure.
    """
    payload = {
        "question": "எபிரெயர் 11:1 விசுவாசம் பற்றி என்ன சொல்கிறது?",
        "answer_type": "short",
        "language": "ta",
    }
    # Test via dedicated /independent endpoint
    res1 = client.post("/api/v1/answers/independent", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["answer"]) > 10
    assert data1["answer_type"] == "short"
    assert len(data1["sources"]) > 0

    # Test via /generate with question_id=None
    res2 = client.post("/api/v1/answers/generate", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["answer"]) > 10


# ==============================================================================
# 4. MEETING-SPECIFIC ANSWERS TESTS
# ==============================================================================

def test_meeting_specific_answer_relationship(client: TestClient):
    """
    Test requesting an answer for a specific meeting question,
    preserving the Meeting -> Question -> Answer -> Sources relationship.
    """
    # 1. Create a meeting
    meeting_payload = {
        "meeting_type": "midweek",
        "meeting_date": "2026-11-26T19:00:00Z",
        "title": "விசுவாசம் குறித்த ஆய்வு கூட்டம்",
        "description": "நடுவாரக் கூட்டம் - எபிரெயர் 11",
    }
    m_res = client.post("/api/v1/meetings", json=meeting_payload)
    assert m_res.status_code == 201
    meeting_id = m_res.json()["id"]

    # 2. Add question to meeting
    q_payload = {
        "section": "treasures",
        "question_text": "எபிரெயர் 11:1-ன்படி விசுவாசம் எவ்வாறு விவரிக்கப்படுகிறது?",
        "paragraph_reference": "பாரா 2",
        "display_order": 1,
    }
    q_res = client.post(f"/api/v1/meetings/{meeting_id}/questions", json=q_payload)
    assert q_res.status_code == 201
    question_id = q_res.json()["id"]

    # 3. Generate answer for this specific meeting question
    gen_res = client.post(
        f"/api/v1/answers/generate-for-question/{question_id}?answer_type=short&save_answer=true"
    )
    assert gen_res.status_code == 200
    answer_data = gen_res.json()
    assert answer_data["saved_answer_id"] is not None
    assert len(answer_data["sources"]) > 0

    # 4. List answers for question and verify relationship
    list_answers = client.get(f"/api/v1/answers/question/{question_id}")
    assert list_answers.status_code == 200
    answers_list = list_answers.json()
    assert len(answers_list) >= 1
    linked_answer = answers_list[0]
    assert linked_answer["question_id"] == question_id
    assert linked_answer["answer_text"] == answer_data["answer"]

    # 5. Save this meeting answer and verify meeting details in SavedAnswerDetailResponse
    save_res = client.post(
        "/api/v1/saved-answers",
        json={
            "answer_id": linked_answer["id"],
            "custom_title": "கூட்ட பதில் - எபிரெயர் 11:1",
            "notes": "பாரா 2 வாசிக்கப்பட்ட பிறகு கை தூக்க வேண்டும்.",
        },
    )
    assert save_res.status_code == 201
    saved_detail = save_res.json()
    assert saved_detail["meeting_id"] == meeting_id
    assert saved_detail["meeting_title"] == meeting_payload["title"]
    assert saved_detail["question_text"] == q_payload["question_text"]
    assert saved_detail["paragraph_reference"] == q_payload["paragraph_reference"]
