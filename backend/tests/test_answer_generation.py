from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

# 15 distinct representative JW meeting questions
FIFTEEN_QUESTIONS = [
    ("இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?", "short"),
    ("மாதிரி ஜெபத்தில் நாம் எதற்கு முதலிடம் கொடுக்க வேண்டும்?", "short"),
    ("கவலைகளை சமாளிக்க பைபிள் தரும் ஆலோசனை என்ன?", "detailed"),
    ("ஜெபம் செய்யும்போது நாம் என்ன மனநிலையோடு இருக்க வேண்டும்?", "short"),
    ("யெகோவாவிடம் உங்கள் பாரத்தை இறக்கிவைப்பது என்றால் என்ன?", "detailed"),
    ("இயேசுவின் ஜெபங்கள் நமக்கு என்ன கற்பிக்கின்றன?", "short"),
    ("கடவுளுடைய அரசாங்கம் ஏன் வர வேண்டும் என்று நாம் ஜெபிக்கிறோம்?", "detailed"),
    ("வெளி ஊழியத்தில் மக்களிடம் நாம் எப்படி பேச வேண்டும்?", "short"),
    ("கிறிஸ்தவ சபைக் கூட்டங்களுக்கு ஒழுங்காக வருவது ஏன் முக்கியம்?", "detailed"),
    ("சோதனைகளின் போது நாம் எப்படி பலம் பெறலாம்?", "short"),
    ("சக விசுவாசிகளுக்கு நாம் எப்படி அன்பு காட்டலாம்?", "detailed"),
    ("பைபிளை தினமும் வாசிப்பதால் கிடைக்கும் நன்மைகள் என்ன?", "short"),
    ("யெகோவாவின் பெயர் பரிசுத்தப்பட வேண்டும் என்பதன் அர்த்தம் என்ன?", "detailed"),
    ("ஆவிக்குரிய இலக்குகளை வைக்க நாம் ஏன் முயற்சி செய்ய வேண்டும்?", "short"),
    ("குடும்பத்தில் சமாதானத்தை காத்துக்கொள்ள பைபிள் என்ன வழிகாட்டுகிறது?", "detailed"),
]


@pytest.fixture(scope="module", autouse=True)
def seed_knowledge_for_answers(client: TestClient):
    """
    Seeds comprehensive reference documents covering prayer, meetings,
    ministry, Christian living, and spiritual growth.
    """
    docs = [
        {
            "title": "இயேசுவின் முன்மாதிரியான ஜெப வாழ்க்கை",
            "content": (
                "இயேசு பூமியில் வாழ்ந்தபோது தம்முடைய பரலோகத் தந்தையிடம் தவறாமல் ஜெபம் செய்தார். "
                "அவர் பரிபூரண மனிதராக இருந்தபோதிலும், கடவுளுடைய வழிநடத்துதலுக்காகவும் பலத்திற்காகவும் "
                "அவரை முழுமையாகச் சார்ந்திருந்தார். ஜெபம் செய்வதன் மூலம் அவர் தாழ்மையைக் காட்டினார், "
                "மற்றும் தம்முடைய தந்தையிடம் உள்ள ஆழ்ந்த அன்பை வெளிப்படுத்தினார்."
            ),
            "source_type": "watchtower",
            "source_url": "https://www.jw.org/ta/library/magazines/w202601/jesus-prayer-life/",
            "language": "ta",
        },
        {
            "title": "மாதிரி ஜெபமும் கடவுளுடைய அரசாங்கமும்",
            "content": (
                "சீடர்கள் இயேசுவிடம்: 'எங்களுக்கு ஜெபம் செய்ய கற்றுக்கொடுங்கள்' என்று கேட்டபோது, "
                "இயேசு அவர்களுக்கு மாதிரி ஜெபத்தை (கர்த்தருடைய ஜெபம்) கற்றுக்கொடுத்தார். "
                "கடவுளுடைய பெயர் பரிசுத்தப்பட வேண்டும் என்றும், அவருடைய அரசாங்கம் வர வேண்டும் என்றும் "
                "முதலில் ஜெபிக்கும்படி அவர் கற்பித்தார். நம்முடைய சொந்த தேவைகளை விட கடவுளுடைய நோக்கங்களுக்கே "
                "நாம் முதலிடம் கொடுக்க வேண்டும்."
            ),
            "source_type": "meeting_workbook",
            "source_url": "https://www.jw.org/ta/library/jw-meeting-workbook/model-prayer-kingdom/",
            "language": "ta",
        },
        {
            "title": "கவலைகளை யெகோவாவிடம் இறக்கிவையுங்கள்",
            "content": (
                "1 பேதுரு 5:7 சொல்கிறது: 'அவர் உங்கள்மீது அக்கறையாக இருப்பதால், உங்கள் கவலைகளையெல்லாம் "
                "அவர்மேல் வைத்துவிடுங்கள்.' சங்கீதம் 55:22-ல் தாவீது: 'உன் பாரத்தை யெகோவாமேல் வைத்துவிடு, "
                "அவர் உன்னை ஆதரிப்பார்' என்று உற்சாகப்படுத்துகிறார். ஜெபம் நம்முடைய மனபாரத்தை இறக்கிவைக்க உதவுகிறது. "
                "கடவுள் தரும் சமாதானம் மனித புத்திக்கு எட்டாதது."
            ),
            "source_type": "awake",
            "source_url": "https://www.jw.org/ta/library/magazines/g202603/cast-burden-on-jehovah/",
            "language": "ta",
        },
        {
            "title": "ஊழியத்தில் அன்பும் நற்செய்தி அறிவிப்பும்",
            "content": (
                "வெளி ஊழியத்தில் மக்களிடம் பேசும்போது நாம் கனிவோடும் மரியாதையோடும் பேச வேண்டும். "
                "அவர்களுடைய சூழ்நிலைகளைப் புரிந்து கொண்டு இரக்கம் காட்ட வேண்டும். "
                "பைபிளிலிருந்து ஆறுதல் தரும் செய்தியை அன்போடு பகிர்வது அவர்களின் இதயத்தைத் தொடும்."
            ),
            "source_type": "meeting_workbook",
            "source_url": "https://www.jw.org/ta/library/jw-meeting-workbook/ministry-with-love/",
            "language": "ta",
        },
        {
            "title": "சபைக் கூட்டங்கள் மற்றும் ஆவிக்குரிய பலம்",
            "content": (
                "எபிரெயர் 10:24, 25 கூட்டங்களுக்கு தவறாமல் வர நம்மை ஊக்குவிக்கிறது. "
                "சபைக் கூட்டங்கள் விசுவாசத்தை பலப்படுத்தவும், ஒருவரையொருவர் அன்பிலும் நற்செயல்களிலும் "
                "தூண்டிவிடவும் உதவுகின்றன. கூட்டங்களில் கலந்துகொள்ளும்போது யெகோவாவின் பரிசுத்த ஆவியின் "
                "ஆதரவையும் சகோதரர்களின் அன்பான கூட்டுறவையும் நாம் பெறுகிறோம்."
            ),
            "source_type": "watchtower",
            "source_url": "https://www.jw.org/ta/library/magazines/w202604/congregation-meetings/",
            "language": "ta",
        },
        {
            "title": "தினசரி பைபிள் வாசிப்பும் குடும்ப சமாதானமும்",
            "content": (
                "சங்கீதம் 1:2, 3 படி தினமும் கடவுளுடைய வார்த்தையை வாசித்து தியானிப்பவர் செழித்திருப்பார். "
                "குடும்பத்தில் பைபிள் நியமங்களைக் கடைப்பிடிக்கும்போது கோபம் மறைந்து சமாதானமும் மகிழ்ச்சியும் நிலவும். "
                "ஆவிக்குரிய இலக்குகளை வைத்து முன்னேறுவது இளைஞர்களுக்கும் குடும்பங்களுக்கும் உண்மையான மனநிறைவைத் தரும்."
            ),
            "source_type": "manual",
            "source_url": "https://www.jw.org/ta/library/books/daily-bible-reading-family/",
            "language": "ta",
        },
    ]

    for d in docs:
        res = client.post("/api/v1/knowledge/ingest-text", json=d)
        assert res.status_code == 201


# ==============================================================================
# 15 QUESTIONS COMPREHENSIVE GENERATION TEST
# ==============================================================================

@pytest.mark.parametrize("question,answer_type", FIFTEEN_QUESTIONS)
def test_generate_answer_fifteen_questions(client: TestClient, question: str, answer_type: str):
    """
    Test generating answers for 15 diverse JW meeting questions.
    Validates natural conversational Tamil, non-empty response, valid sources,
    and appropriate answer length.
    """
    payload = {
        "question": question,
        "answer_type": answer_type,
        "language": "ta",
    }
    response = client.post("/api/v1/answers/generate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert data["answer_type"] == answer_type

    answer_text = data["answer"]
    assert len(answer_text) > 15, f"Answer for '{question}' is too short."

    # Verify response contains Tamil characters
    has_tamil = any("\u0b80" <= char <= "\u0bff" for char in answer_text)
    assert has_tamil, f"Answer for '{question}' does not contain Tamil characters."

    # Verify answers do not repeat the question literally as a robotic prompt echo
    assert not answer_text.startswith(question)

    # Verify sources array is valid list
    assert isinstance(data["sources"], list)


# ==============================================================================
# SPECIFIC FUNCTIONALITY TESTS
# ==============================================================================

def test_short_answer_conciseness(client: TestClient):
    """
    Verifies that a short answer is compact and suited for 20-40 seconds spoken.
    """
    payload = {
        "question": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
        "answer_type": "short",
    }
    response = client.post("/api/v1/answers/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["answer_type"] == "short"

    # Spoken word count check (~35-65 words in Tamil)
    words = data["answer"].split()
    assert len(words) <= 75
    assert len(data["sources"]) > 0


def test_detailed_answer_explanation(client: TestClient):
    """
    Verifies that a detailed answer contains deeper explanation.
    """
    payload = {
        "question": "கவலைகளை சமாளிக்க பைபிள் தரும் ஆலோசனை என்ன?",
        "answer_type": "detailed",
    }
    response = client.post("/api/v1/answers/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["answer_type"] == "detailed"

    # Detailed answers are richer
    assert len(data["answer"]) >= 60
    assert len(data["sources"]) > 0


def test_insufficient_context_handling(client: TestClient):
    """
    When retrieved information is completely out of scope (e.g. quantum physics),
    the system must politely state sufficient supporting information was not found
    rather than fabricating an answer.
    """
    payload = {
        "question": "குவாண்டம் இயற்பியல் மற்றும் செயற்கைக்கோள் வழிசெலுத்தல் பற்றி விளக்குக?",
        "answer_type": "short",
    }
    response = client.post("/api/v1/answers/generate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Must indicate insufficient information found
    assert (
        "போதுமான ஆதாரக் குறிப்புகள் கிடைக்கவில்லை" in data["answer"]
        or "jw.org" in data["answer"]
    )


def test_save_generated_answer_to_sqlite(client: TestClient):
    """
    Verifies that save_answer=True persists the answer in SQLite.
    """
    # Create a meeting and question first
    meeting_res = client.post(
        "/api/v1/meetings",
        json={
            "meeting_type": "midweek",
            "meeting_date": "2026-11-25T19:00:00Z",
            "title": "சேமிப்பு சோதனை கூட்டம்",
        },
    )
    meeting_id = meeting_res.json()["id"]

    q_res = client.post(
        f"/api/v1/meetings/{meeting_id}/questions",
        json={
            "section": "treasures",
            "question_text": "யெகோவாவிடம் நாம் எப்படி ஜெபிக்க வேண்டும்?",
            "paragraph_reference": "பாரா 4",
        },
    )
    question_id = q_res.json()["id"]

    payload = {
        "question": "யெகோவாவிடம் நாம் எப்படி ஜெபிக்க வேண்டும்?",
        "answer_type": "short",
        "question_id": question_id,
        "save_answer": True,
    }
    response = client.post("/api/v1/answers/generate", json=payload)
    assert response.status_code == 200

    data = response.json()
    saved_id = data.get("saved_answer_id")
    assert saved_id is not None

    # Verify retrieval from SQLite answers endpoint
    get_res = client.get(f"/api/v1/answers/{saved_id}")
    assert get_res.status_code == 200
    saved_doc = get_res.json()
    assert saved_doc["id"] == saved_id
    assert saved_doc["question_id"] == question_id
    assert saved_doc["answer_text"] == data["answer"]


def test_groq_async_client_mock_invocation(client: TestClient):
    """
    Verifies that when Groq API is active, AsyncGroq is invoked with
    structured prompts, temperature, and tokens.
    """
    mock_response = AsyncMock()
    mock_choice = AsyncMock()
    mock_choice.message.content = "இயேசு கடவுளை முழுமையாகச் சார்ந்திருந்ததால் அவரிடம் உருக்கமாக ஜெபித்தார்."
    mock_response.choices = [mock_choice]

    mock_client_instance = AsyncMock()
    mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)

    from app.services.llm import GroqService
    from app.services.answer_generator import AnswerGeneratorService

    custom_groq = GroqService(api_key="gsk_test_api_key_valid")
    custom_groq.async_client = mock_client_instance
    custom_groq.is_configured = True

    gen_service = AnswerGeneratorService(groq_service=custom_groq)

    with patch("app.api.routes.answers.get_answer_generator", return_value=gen_service):
        payload = {
            "question": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
            "answer_type": "short",
        }
        res = client.post("/api/v1/answers/generate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["answer"] == "இயேசு கடவுளை முழுமையாகச் சார்ந்திருந்ததால் அவரிடம் உருக்கமாக ஜெபித்தார்."
        mock_client_instance.chat.completions.create.assert_awaited_once()


def test_validation_empty_question(client: TestClient):
    """
    Rejects empty question payload with 422.
    """
    response = client.post(
        "/api/v1/answers/generate",
        json={"question": "   \n\t   ", "answer_type": "short"},
    )
    assert response.status_code == 422
