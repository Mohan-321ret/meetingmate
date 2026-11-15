from datetime import datetime, timezone
from fastapi.testclient import TestClient


def test_create_meeting_success(client: TestClient):
    payload = {
        "meeting_type": "midweek",
        "meeting_date": "2026-11-18T19:00:00Z",
        "title": "கிறிஸ்தவ வாழ்க்கையும் ஊழியமும்",
        "description": "நடுவாரக் கூட்டம் - லேவியராகமம் 1-4",
    }
    response = client.post("/api/v1/meetings", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["meeting_type"] == "midweek"
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert "created_at" in data
    assert "updated_at" in data


def test_create_meeting_invalid_type(client: TestClient):
    payload = {
        "meeting_type": "invalid_type",
        "meeting_date": "2026-11-18T19:00:00Z",
        "title": "Invalid Meeting",
    }
    response = client.post("/api/v1/meetings", json=payload)
    assert response.status_code == 422


def test_list_meetings_and_filtering(client: TestClient):
    # Seed one midweek and one weekend
    client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "midweek",
            "meeting_date": "2026-11-25T19:00:00Z",
            "title": "Midweek Meeting 1",
        },
    )
    client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "weekend",
            "meeting_date": "2026-11-29T10:00:00Z",
            "title": "Weekend Meeting 1",
        },
    )

    # 1. List all
    res_all = client.get("/api/v1/meetings")
    assert res_all.status_code == 200
    all_meetings = res_all.json()
    assert len(all_meetings) >= 2

    # 2. Filter by type=midweek
    res_midweek = client.get("/api/v1/meetings?meeting_type=midweek")
    assert res_midweek.status_code == 200
    for m in res_midweek.json():
        assert m["meeting_type"] == "midweek"

    # 3. Filter by type=weekend
    res_weekend = client.get("/api/v1/meetings?meeting_type=weekend")
    assert res_weekend.status_code == 200
    for m in res_weekend.json():
        assert m["meeting_type"] == "weekend"

    # 4. Filter by date
    res_date = client.get("/api/v1/meetings?date=2026-11-29")
    assert res_date.status_code == 200
    date_meetings = res_date.json()
    assert len(date_meetings) >= 1
    assert "2026-11-29" in date_meetings[0]["meeting_date"]


def test_get_meeting_by_id(client: TestClient):
    # Create meeting
    created = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "weekend",
            "meeting_date": "2026-12-06T10:00:00Z",
            "title": "காவற்கோபுர படிப்பு கூட்டம்",
        },
    ).json()

    # Fetch by ID
    res = client.get(f"/api/v1/meetings/{created['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == created["id"]
    assert data["title"] == "காவற்கோபுர படிப்பு கூட்டம்"
    assert "questions" in data
    assert isinstance(data["questions"], list)


def test_get_meeting_not_found(client: TestClient):
    res = client.get("/api/v1/meetings/non_existent_id")
    assert res.status_code == 404
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"


def test_update_meeting(client: TestClient):
    created = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "midweek",
            "meeting_date": "2026-12-10T19:00:00Z",
            "title": "பழைய தலைப்பு",
        },
    ).json()

    # Update title and description
    res = client.put(
        f"/api/v1/meetings/{created['id']}",
        json={
            "title": "புதிய திருத்தப்பட்ட தலைப்பு",
            "description": "புதிய குறிப்புகள்",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "புதிய திருத்தப்பட்ட தலைப்பு"
    assert data["description"] == "புதிய குறிப்புகள்"


def test_update_meeting_not_found(client: TestClient):
    res = client.put(
        "/api/v1/meetings/non_existent_id",
        json={"title": "Updated"},
    )
    assert res.status_code == 404


def test_delete_meeting(client: TestClient):
    created = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "weekend",
            "meeting_date": "2026-12-13T10:00:00Z",
            "title": "நீக்கப்பட வேண்டிய கூட்டம்",
        },
    ).json()

    # Delete
    del_res = client.delete(f"/api/v1/meetings/{created['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify 404 on subsequent get
    get_res = client.get(f"/api/v1/meetings/{created['id']}")
    assert get_res.status_code == 404


def test_delete_meeting_not_found(client: TestClient):
    res = client.delete("/api/v1/meetings/non_existent_id")
    assert res.status_code == 404
