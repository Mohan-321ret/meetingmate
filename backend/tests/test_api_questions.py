from fastapi.testclient import TestClient


def create_sample_meeting(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "midweek",
            "meeting_date": "2026-11-20T19:00:00Z",
            "title": "நடுவாரக் கூட்டம் - கேள்வி சோதனை",
        },
    )
    return response.json()


def test_add_questions_to_meeting(client: TestClient):
    meeting = create_sample_meeting(client)
    meeting_id = meeting["id"]

    # Add question 1 (display_order not given, auto assigns 1)
    q1_res = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={
            "section": "treasures",
            "question_text": "லேவியராகமம் 1:3-ல் இருந்து நாம் என்ன கற்றுக்கொள்ளலாம்?",
            "paragraph_reference": "பாரா 3",
        },
    )
    assert q1_res.status_code == 201
    q1 = q1_res.json()
    assert q1["meeting_id"] == meeting_id
    assert q1["section"] == "treasures"
    assert q1["display_order"] == 1

    # Add question 2 (auto assigns 2)
    q2_res = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={
            "section": "treasures",
            "question_text": "ஆன்மீக புதையல்கள் கேள்வி 2",
            "paragraph_reference": "பாரா 4",
        },
    )
    assert q2_res.status_code == 201
    q2 = q2_res.json()
    assert q2["display_order"] == 2

    # Add question 3 under another section (ministry)
    q3_res = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={
            "section": "ministry",
            "question_text": "ஊழிய உரையாடல் தொடக்கம்",
            "display_order": 10,
        },
    )
    assert q3_res.status_code == 201
    q3 = q3_res.json()
    assert q3["display_order"] == 10


def test_add_question_to_non_existent_meeting(client: TestClient):
    res = client.post(
        "/api/v1/meetings/non_existent_meeting/questions",
        json={
            "section": "treasures",
            "question_text": "Test question",
        },
    )
    assert res.status_code == 404
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_list_meeting_questions_and_filtering(client: TestClient):
    meeting = create_sample_meeting(client)
    meeting_id = meeting["id"]

    # Seed 2 treasures, 1 living
    client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={"section": "treasures", "question_text": "புதையல் 1", "display_order": 1},
    )
    client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={"section": "treasures", "question_text": "புதையல் 2", "display_order": 2},
    )
    client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={"section": "living", "question_text": "கிறிஸ்தவ வாழ்க்கை 1", "display_order": 3},
    )

    # 1. List all for meeting
    res_all = client.get(f"/api/v1/meetings/{meeting_id}/questions")
    assert res_all.status_code == 200
    all_q = res_all.json()
    assert len(all_q) == 3
    assert [q["display_order"] for q in all_q] == [1, 2, 3]

    # 2. Filter by section=treasures
    res_treasures = client.get(f"/api/v1/meetings/{meeting_id}/questions?section=treasures")
    assert res_treasures.status_code == 200
    treasures = res_treasures.json()
    assert len(treasures) == 2
    assert all(q["section"] == "treasures" for q in treasures)

    # 3. Filter by section=living
    res_living = client.get(f"/api/v1/meetings/{meeting_id}/questions?section=living")
    assert res_living.status_code == 200
    assert len(res_living.json()) == 1


def test_list_questions_non_existent_meeting(client: TestClient):
    res = client.get("/api/v1/meetings/non_existent_meeting/questions")
    assert res.status_code == 404


def test_reorder_questions(client: TestClient):
    meeting = create_sample_meeting(client)
    meeting_id = meeting["id"]

    q1 = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={"section": "treasures", "question_text": "கேள்வி A", "display_order": 1},
    ).json()
    q2 = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={"section": "treasures", "question_text": "கேள்வி B", "display_order": 2},
    ).json()

    # Reorder: Swap Q1 to order 2 and Q2 to order 1
    reorder_payload = {
        "items": [
            {"id": q1["id"], "display_order": 2},
            {"id": q2["id"], "display_order": 1},
        ]
    }
    reorder_res = client.put(
        f"/api/v1/meetings/{meeting_id}/questions/reorder",
        json=reorder_payload,
    )
    assert reorder_res.status_code == 200
    reordered = reorder_res.json()
    assert reordered[0]["id"] == q2["id"]
    assert reordered[0]["display_order"] == 1
    assert reordered[1]["id"] == q1["id"]
    assert reordered[1]["display_order"] == 2


def test_get_individual_question(client: TestClient):
    meeting = create_sample_meeting(client)
    q = client.post(
        f"/api/v1/meetings/{meeting['id']}/questions",
        json={
            "section": "watchtower",
            "question_text": "யெகோவாவின் வழிநடத்துதலை எவ்வாறு நாடுவது?",
            "paragraph_reference": "பாரா 1 கேள்வி",
        },
    ).json()

    # Fetch by ID
    res = client.get(f"/api/v1/questions/{q['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == q["id"]
    assert data["question_text"] == "யெகோவாவின் வழிநடத்துதலை எவ்வாறு நாடுவது?"
    assert data["paragraph_reference"] == "பாரா 1 கேள்வி"


def test_get_individual_question_not_found(client: TestClient):
    res = client.get("/api/v1/questions/non_existent_q_id")
    assert res.status_code == 404


def test_update_individual_question(client: TestClient):
    meeting = create_sample_meeting(client)
    q = client.post(
        f"/api/v1/meetings/{meeting['id']}/questions",
        json={
            "section": "watchtower",
            "question_text": "பழைய கேள்வி",
        },
    ).json()

    # Update question text and paragraph reference
    res = client.put(
        f"/api/v1/questions/{q['id']}",
        json={
            "question_text": "திருத்தப்பட்ட புதிய கேள்வி உரை",
            "paragraph_reference": "பாரா 5",
            "display_order": 3,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["question_text"] == "திருத்தப்பட்ட புதிய கேள்வி உரை"
    assert data["paragraph_reference"] == "பாரா 5"
    assert data["display_order"] == 3


def test_update_individual_question_not_found(client: TestClient):
    res = client.put(
        "/api/v1/questions/non_existent_q_id",
        json={"question_text": "New Text"},
    )
    assert res.status_code == 404


def test_delete_individual_question(client: TestClient):
    meeting = create_sample_meeting(client)
    q = client.post(
        f"/api/v1/meetings/{meeting['id']}/questions",
        json={
            "section": "living",
            "question_text": "நீக்கப்பட வேண்டிய கேள்வி",
        },
    ).json()

    # Delete
    del_res = client.delete(f"/api/v1/questions/{q['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Subsequent GET returns 404
    get_res = client.get(f"/api/v1/questions/{q['id']}")
    assert get_res.status_code == 404


def test_delete_individual_question_not_found(client: TestClient):
    res = client.delete("/api/v1/questions/non_existent_q_id")
    assert res.status_code == 404
