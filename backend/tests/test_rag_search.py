import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module", autouse=True)
def seed_knowledge_base(client: TestClient):
    """
    Seed representative Tamil, English, and bilingual JW reference materials
    for testing the RAG retrieval engine.
    """
    articles = [
        {
            "title": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
            "content": (
                "இயேசு பூமியில் வாழ்ந்தபோது தம்முடைய பரலோகத் தந்தையிடம் தவறாமல் ஜெபம் செய்தார். "
                "அவர் பரிபூரண மனிதராக இருந்தபோதிலும், கடவுளுடைய வழிநடத்துதலுக்காகவும் பலத்திற்காகவும் "
                "அவரை முழுமையாகச் சார்ந்திருந்தார். ஜெபம் செய்வதன் மூலம் அவர் தாழ்மையைக் காட்டினார், "
                "மற்றும் தம்முடைய தந்தையிடம் உள்ள ஆழ்ந்த அன்பை வெளிப்படுத்தினார்."
            ),
            "source_type": "watchtower",
            "source_url": "https://www.jw.org/ta/library/magazines/w202601/why-jesus-prayed/",
            "language": "ta",
        },
        {
            "title": "மாதிரி ஜெபமும் சீடர்களின் கேள்வியும்",
            "content": (
                "சீடர்கள் இயேசுவிடம்: 'எங்களுக்கு ஜெபம் செய்ய கற்றுக்கொடுங்கள்' என்று கேட்டபோது, "
                "இயேசு அவர்களுக்கு மாதிரி ஜெபத்தை (கர்த்தருடைய ஜெபம்) கற்றுக்கொடுத்தார். "
                "கடவுளுடைய பெயர் பரிசுத்தப்பட வேண்டும் என்றும், அவருடைய அரசாங்கம் வர வேண்டும் என்றும் "
                "முதலில் ஜெபிக்கும்படி அவர் கற்பித்தார்."
            ),
            "source_type": "meeting_workbook",
            "source_url": "https://www.jw.org/ta/library/jw-meeting-workbook/model-prayer/",
            "language": "ta",
        },
        {
            "title": "Why Did Jesus Pray to His Heavenly Father?",
            "content": (
                "Throughout his earthly life, Jesus prayed regularly and earnestly to Jehovah God. "
                "Even though he was perfect, Jesus recognized his complete dependence on his Father "
                "for wisdom, strength, and endurance during critical trials. His prayers demonstrated "
                "humility, obedience, and an unbreakable bond of loyalty."
            ),
            "source_type": "watchtower",
            "source_url": "https://www.jw.org/en/library/magazines/w202601/why-jesus-prayed-english/",
            "language": "en",
        },
        {
            "title": "கவலைகளை சமாளிக்க பைபிள் தரும் ஆறுதல்",
            "content": (
                "1 பேதுரு 5:7 சொல்கிறது: 'அவர் உங்கள்மீது அக்கறையாக இருப்பதால், உங்கள் கவலைகளையெல்லாம் "
                "அவர்மேல் வைத்துவிடுங்கள்.' சங்கீதம் 55:22-ல் தாவீது: 'உன் பாரத்தை யெகோவாமேல் வைத்துவிடு, "
                "அவர் உன்னை ஆதரிப்பார்' என்று உற்சாகப்படுத்துகிறார். ஜெபம் நம்முடைய மனபாரத்தை இறக்கிவைக்க உதவுகிறது."
            ),
            "source_type": "awake",
            "source_url": "https://www.jw.org/ta/library/magazines/g202603/coping-with-anxiety/",
            "language": "ta",
        },
    ]

    for art in articles:
        res = client.post("/api/v1/knowledge/ingest-text", json=art)
        assert res.status_code == 201


# ==============================================================================
# RAG RETRIEVAL ENGINE TESTS
# ==============================================================================

def test_search_tamil_question(client: TestClient):
    """
    Test 1: Search using a natural Tamil question.
    """
    payload = {
        "query": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
        "top_k": 3,
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["query"] == payload["query"]
    assert len(data["results"]) > 0

    top_result = data["results"][0]
    assert "content" in top_result
    assert "source_title" in top_result
    assert "relevance_score" in top_result
    assert top_result["relevance_score"] >= 0.60
    assert "இயேசு" in top_result["content"] or "ஜெபம்" in top_result["content"]
    assert top_result["source_title"] == "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?"
    assert top_result["source_url"] == "https://www.jw.org/ta/library/magazines/w202601/why-jesus-prayed/"


def test_search_english_question(client: TestClient):
    """
    Test 2: Search using an English question.
    """
    payload = {
        "query": "Why did Jesus pray to his heavenly Father?",
        "top_k": 3,
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["results"]) > 0

    top_result = data["results"][0]
    assert "Jesus" in top_result["content"] or "prayed" in top_result["content"]
    assert top_result["relevance_score"] >= 0.60
    assert top_result["source_title"] == "Why Did Jesus Pray to His Heavenly Father?"


def test_search_mixed_tamil_english_question(client: TestClient):
    """
    Test 3: Search using a mixed Tamil-English query.
    """
    payload = {
        "query": "இயேசு model prayer மற்றும் ஜெபம் பற்றி என்ன கற்பித்தார்?",
        "top_k": 3,
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["results"]) > 0

    # Top results should encompass prayer teachings or model prayer
    matched_titles = [r["source_title"] for r in data["results"]]
    assert any("ஜெப" in title for title in matched_titles)
    for r in data["results"]:
        assert 0.0 <= r["relevance_score"] <= 1.0


def test_search_source_type_filter(client: TestClient):
    """
    Test 4: Metadata filtering by source_type (e.g. meeting_workbook only).
    """
    payload = {
        "query": "ஜெபம் எப்படி செய்ய வேண்டும்?",
        "top_k": 5,
        "source_type": "meeting_workbook",
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["results"]) > 0
    for res in data["results"]:
        assert res["source_type"] == "meeting_workbook"
    matched_titles = [res["source_title"] for res in data["results"]]
    assert "மாதிரி ஜெபமும் சீடர்களின் கேள்வியும்" in matched_titles


def test_search_language_filter(client: TestClient):
    """
    Test 5: Metadata filtering by language (e.g. language="en").
    """
    payload = {
        "query": "Jesus prayers and dependence on God",
        "top_k": 3,
        "language": "en",
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["results"]) > 0
    for res in data["results"]:
        assert res["language"] == "en"


def test_search_configurable_top_k(client: TestClient):
    """
    Test 6: Configurable top_k parameter respects limits.
    """
    # top_k = 1
    res1 = client.post("/api/v1/search", json={"query": "ஜெபம்", "top_k": 1})
    assert res1.status_code == 200
    assert len(res1.json()["results"]) == 1

    # top_k = 2
    res2 = client.post("/api/v1/search", json={"query": "ஜெபம்", "top_k": 2})
    assert res2.status_code == 200
    assert len(res2.json()["results"]) <= 2


def test_search_min_score_threshold(client: TestClient):
    """
    Test 7: min_score threshold filters out weak matches.
    """
    # Highly specific threshold
    high_threshold_payload = {
        "query": "வானியல் மற்றும் விண்வெளி தொழில்நுட்பம்",
        "top_k": 5,
        "min_score": 0.95,
    }
    response = client.post("/api/v1/search", json=high_threshold_payload)
    assert response.status_code == 200
    # No document in knowledge base about space telescopes should reach 0.95
    assert len(response.json()["results"]) == 0


def test_search_deduplication(client: TestClient):
    """
    Test 8: Distinct chunks are returned without duplicates.
    """
    payload = {
        "query": "கவலைகள் மற்றும் மனபாரம்",
        "top_k": 5,
    }
    response = client.post("/api/v1/search", json=payload)
    assert response.status_code == 200

    results = response.json()["results"]
    seen_contents = set()
    for item in results:
        normalized = item["content"].strip().lower()
        assert normalized not in seen_contents, "Duplicate chunk detected in retrieval results!"
        seen_contents.add(normalized)


def test_search_empty_query_validation(client: TestClient):
    """
    Test 9: Whitespace-only or blank query returns 422 error.
    """
    response = client.post("/api/v1/search", json={"query": "   \n\t  "})
    assert response.status_code == 422
    err = response.json()["error"]
    assert err["code"] in {"VALIDATION_ERROR", "REQUEST_VALIDATION_ERROR"}


def test_search_invalid_source_type_validation(client: TestClient):
    """
    Test 10: Invalid source_type filter rejected by Pydantic schema.
    """
    response = client.post("/api/v1/search", json={"query": "test", "source_type": "invalid_type"})
    assert response.status_code == 422


def test_search_no_answer_generation(client: TestClient):
    """
    Test 11: Verify that retrieval service returns only source chunks
    and never fabricates or generates LLM answers.
    """
    response = client.post("/api/v1/search", json={"query": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?"})
    assert response.status_code == 200

    data = response.json()
    assert "answer" not in data, "Retrieval service must never return a generated answer!"
    assert len(data["results"]) > 0
    top_result = data["results"][0]
    assert "இயேசு பூமியில் வாழ்ந்தபோது" in top_result["content"]
    for item in data["results"]:
        assert "content" in item
        assert "source_title" in item
        assert "relevance_score" in item


def test_search_excludes_deleted_document(client: TestClient):
    """
    Test 12: Chunks from deleted documents are not returned in search results.
    """
    # Ingest a temporary document
    temp_doc = {
        "title": "தற்காலிக ஆய்வு கட்டுரை - நீக்கப்பட உள்ளது",
        "content": "இந்த தனித்துவமான ரகசிய வரி நீக்கத்திற்குப் பிறகு தேடலில் வரக்கூடாது: எக்ஸ்காலிபர் 999",
        "source_type": "other",
        "language": "ta",
    }
    ingest_res = client.post("/api/v1/knowledge/ingest-text", json=temp_doc)
    assert ingest_res.status_code == 201
    doc_id = ingest_res.json()["document"]["id"]

    # Verify searchable before deletion
    search_before = client.post("/api/v1/search", json={"query": "எக்ஸ்காலிபர் 999"})
    assert search_before.status_code == 200
    assert len(search_before.json()["results"]) > 0

    # Delete the document
    del_res = client.delete(f"/api/v1/knowledge/documents/{doc_id}")
    assert del_res.status_code == 200

    # Verify no longer searchable after deletion
    search_after = client.post("/api/v1/search", json={"query": "எக்ஸ்காலிபர் 999"})
    assert search_after.status_code == 200
    matched = [r for r in search_after.json()["results"] if "எக்ஸ்காலிபர் 999" in r["content"]]
    assert len(matched) == 0
