from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient
from app.services.jw_scraper import (
    JWMeetingScraperService,
    calculate_meeting_week,
    get_jw_scraper_service,
)
from app.services.retrieval import get_retrieval_service


def test_calculate_meeting_week_same_month():
    # 2026-11-18 is a Wednesday
    ref = date(2026, 11, 18)
    monday_dt, midweek_dt, weekend_dt, label_ta, label_en = calculate_meeting_week(ref)

    assert monday_dt.date() == date(2026, 11, 16)
    assert midweek_dt.date() == date(2026, 11, 18)
    assert weekend_dt.date() == date(2026, 11, 22)
    assert label_ta == "நவம்பர் 16-22, 2026"
    assert label_en == "November 16-22, 2026"


def test_calculate_meeting_week_cross_month():
    # 2026-12-02 is a Wednesday, Monday is 2026-11-30, Sunday is 2026-12-06
    ref = date(2026, 12, 2)
    monday_dt, midweek_dt, weekend_dt, label_ta, label_en = calculate_meeting_week(ref)

    assert monday_dt.date() == date(2026, 11, 30)
    assert midweek_dt.date() == date(2026, 12, 2)
    assert weekend_dt.date() == date(2026, 12, 6)
    assert label_ta == "நவம்பர் 30 – டிசம்பர் 6, 2026"
    assert label_en == "November 30 – December 6, 2026"


def test_midweek_data_generator():
    scraper = JWMeetingScraperService()
    ref_dt = datetime(2026, 11, 18, 19, 0, tzinfo=timezone.utc)
    scraped = scraper.generate_midweek_meeting_data(
        midweek_date=ref_dt,
        week_label="நவம்பர் 16-22, 2026",
        language="ta",
    )

    assert scraped.meeting_type == "midweek"
    assert scraped.meeting_date == ref_dt
    assert len(scraped.questions) >= 5
    assert any("புதையல்கள்" in q.section for q in scraped.questions)
    assert any("சபை பைபிள் படிப்பு" in q.section for q in scraped.questions)
    assert "கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்" in scraped.lesson_content


def test_weekend_data_generator():
    scraper = JWMeetingScraperService()
    ref_dt = datetime(2026, 11, 22, 10, 0, tzinfo=timezone.utc)
    scraped = scraper.generate_weekend_meeting_data(
        weekend_date=ref_dt,
        week_label="நவம்பர் 16-22, 2026",
        language="ta",
    )

    assert scraped.meeting_type == "weekend"
    assert scraped.meeting_date == ref_dt
    assert len(scraped.questions) >= 8
    assert any("மறுபார்வை" in q.section for q in scraped.questions)
    assert "1 பேதுரு 5:7" in scraped.lesson_content


def test_parse_midweek_html_mock():
    scraper = JWMeetingScraperService()
    mock_html = """
    <html>
      <body>
        <article>
          <h1>நவம்பர் 16-22</h1>
          <h2>கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்</h2>
          <h3>புதையல்களைத் தோண்டி எடுங்கள்</h3>
          <h2>கிறிஸ்தவ வாழ்க்கை</h2>
          <h3>சபை பைபிள் படிப்பு</h3>
          <p class="qu">1. மாதிரி ஜெபத்திலிருந்து நாம் என்ன கற்றுக்கொள்கிறோம்?</p>
          <p class="pGroup">மாதிரி ஜெபத்தில் இயேசு தம்முடைய சீடர்களுக்கு எதற்கு முதலிடம் கொடுக்க வேண்டும் என்று கற்பித்தார்.</p>
        </article>
      </body>
    </html>
    """
    ref_dt = datetime(2026, 11, 18, 19, 0, tzinfo=timezone.utc)
    scraped = scraper.parse_midweek_html(
        html=mock_html,
        midweek_date=ref_dt,
        week_label="நவம்பர் 16-22, 2026",
        source_url="https://test.jw.org/midweek",
        language="ta",
    )

    assert scraped.meeting_type == "midweek"
    assert len(scraped.questions) >= 1
    assert any(
        "மாதிரி ஜெப" in q.question_text
        or "கற்றுக்கொள்கிறோம்" in q.question_text
        or "இரத்தினங்களை" in q.question_text
        for q in scraped.questions
    )


def test_parse_watchtower_html_mock():
    scraper = JWMeetingScraperService()
    mock_html = """
    <html>
      <body>
        <article>
          <h1>உங்கள் கவலைகளையெல்லாம் அவர்மேல் வைத்துவிடுங்கள்</h1>
          <p class="themeScrp">‘அவர் உங்கள்மீது அக்கறையாக இருப்பதால், உங்கள் கவலைகளையெல்லாம் அவர்மேல் வைத்துவிடுங்கள்.’—1 பேதுரு 5:7.</p>
          <p class="qu"><strong>1, 2.</strong> நாம் ஏன் கவலைகளை யெகோவாவிடம் இறக்கிவைக்க வேண்டும்?</p>
          <p class="pGroup">இந்த உலகில் நாம் பல்வேறு இன்னல்களை சந்திக்கிறோம்.</p>
          <p class="qu"><strong>3.</strong> தாவீது தன் பாரத்தை யெகோவாவிடம் எப்படி ஒப்படைத்தார்?</p>
          <p class="pGroup">சங்கீதம் 55:22 தாவீதின் முன்மாதிரியை காட்டுகிறது.</p>
          <div class="boxContent">
            <h2>மறுபார்வை</h2>
            <p>1 பேதுரு 5:7 நமக்கு என்ன தைரியத்தை அளிக்கிறது?</p>
          </div>
        </article>
      </body>
    </html>
    """
    ref_dt = datetime(2026, 11, 22, 10, 0, tzinfo=timezone.utc)
    scraped = scraper.parse_watchtower_study_html(
        html=mock_html,
        weekend_date=ref_dt,
        week_label="நவம்பர் 16-22, 2026",
        source_url="https://test.jw.org/watchtower",
        language="ta",
    )

    assert scraped.meeting_type == "weekend"
    assert len(scraped.questions) >= 2
    assert any("கவலைகளை" in q.question_text for q in scraped.questions)
    assert any("மறுபார்வை" in q.section for q in scraped.questions)


def test_api_sync_jw_meetings(client: TestClient):
    response = client.post(
        "/api/v1/meetings/sync-jw?target_date=2026-11-18&language=ta&force_refresh=true"
    )
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert "நவம்பர்" in data["week_label"]
    assert data["midweek_meeting"] is not None
    assert data["weekend_meeting"] is not None
    assert data["total_questions_created"] >= 10
    assert data["chroma_chunks_indexed"] >= 1
    assert len(data["source_urls"]) >= 1

    # Verify meetings were stored in SQLite
    midweek_id = data["midweek_meeting"]["id"]
    weekend_id = data["weekend_meeting"]["id"]

    res_midweek = client.get(f"/api/v1/meetings/{midweek_id}")
    assert res_midweek.status_code == 200
    midweek_data = res_midweek.json()
    assert len(midweek_data["questions"]) >= 5

    res_weekend = client.get(f"/api/v1/meetings/{weekend_id}")
    assert res_weekend.status_code == 200
    weekend_data = res_weekend.json()
    assert len(weekend_data["questions"]) >= 7


def test_api_sync_jw_without_force_refresh(client: TestClient):
    # First sync
    res1 = client.post(
        "/api/v1/meetings/sync-jw?target_date=2026-11-18&language=ta&force_refresh=false"
    )
    assert res1.status_code == 200

    # Second sync without force should recognize existing meetings
    res2 = client.post(
        "/api/v1/meetings/sync-jw?target_date=2026-11-18&language=ta&force_refresh=false"
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert data2["chroma_chunks_indexed"] == 0  # didn't re-index because existing meeting reused


def test_api_get_current_week_meetings(client: TestClient):
    response = client.get("/api/v1/meetings/current-week?language=ta&auto_sync=true")
    assert response.status_code == 200
    data = response.json()

    assert "week_label" in data
    assert "start_date" in data
    assert "end_date" in data
    assert data["midweek"] is not None
    assert data["weekend"] is not None
    assert len(data["midweek"]["questions"]) > 0
    assert len(data["weekend"]["questions"]) > 0


def test_vector_db_indexed_meeting_chunks(client: TestClient):
    # Ensure sync ran
    client.post("/api/v1/meetings/sync-jw?target_date=2026-11-18&language=ta&force_refresh=true")

    # Search for text from the ingested lesson content via RAG search API
    payload = {
        "query": "கவலைகளை சமாளிக்க ஜெபம் எப்படி உதவுகிறது?",
        "top_k": 5,
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    results = data["results"]

    assert len(results) > 0
    assert any("யெகோவா" in r["content"] or "கவலை" in r["content"] or "ஜெபம்" in r["content"] for r in results)
