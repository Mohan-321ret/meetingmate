import io
from typing import List
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.services.vector_store import ChromaVectorStore, get_vector_store


def create_sample_pdf_bytes(pages_text: List[str]) -> bytes:
    """
    Constructs a valid in-memory multi-page PDF document with extractable text streams.
    """
    writer = PdfWriter()
    for text in pages_text:
        page = writer.add_blank_page(width=612, height=792)

        # Build content stream with BT / ET text block
        # Escape parenthesis in PDF string
        escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content = f"BT /F1 12 Tf 72 712 Td ({escaped}) Tj ET".encode("latin-1", errors="replace")

        stream = DecodedStreamObject()
        stream.set_data(content)
        stream_ref = writer._add_object(stream)
        page[NameObject("/Contents")] = stream_ref

        # Add font resource
        font_dict = DictionaryObject()
        font_dict[NameObject("/Type")] = NameObject("/Font")
        font_dict[NameObject("/Subtype")] = NameObject("/Type1")
        font_dict[NameObject("/BaseFont")] = NameObject("/Helvetica")
        font_ref = writer._add_object(font_dict)

        res = DictionaryObject()
        res[NameObject("/Font")] = DictionaryObject({NameObject("/F1"): font_ref})
        page[NameObject("/Resources")] = res

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# ==============================================================================
# INGESTION API TESTS
# ==============================================================================

def test_ingest_raw_text_success(client: TestClient):
    payload = {
        "title": "காவற்கோபுரம் படிப்பு - நவம்பர் 2026",
        "content": (
            "யெகோவாவிடம் உங்கள் பாரத்தை இறக்கிவையுங்கள். அவர் உங்களை ஆதரிப்பார். "
            "நீதிமானை ஒருபோதும் தள்ளாடவிடமாட்டார்.\n\n"
            "நாம் ஜெபம் செய்யும்போது யெகோவா நம்முடைய மனவேதனையைக் கேட்கிறார். "
            "அவர் நமக்குத் தேவையான தெய்வீக சமாதானத்தை அருளுகிறார்."
        ),
        "source_type": "watchtower",
        "source_url": "https://www.jw.org/ta/library/magazines/w202611/trust-in-jehovah/",
        "language": "ta",
    }
    response = client.post("/api/v1/knowledge/ingest-text", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "document" in data
    assert data["chunks_created"] >= 1

    doc = data["document"]
    assert doc["id"] is not None
    assert doc["title"] == payload["title"]
    assert doc["source_type"] == "watchtower"
    assert doc["source_url"] == payload["source_url"]
    assert doc["language"] == "ta"
    assert doc["document_status"] == "indexed"
    assert doc["chunk_count"] == data["chunks_created"]

    # Verify retrieval by ID
    get_res = client.get(f"/api/v1/knowledge/documents/{doc['id']}")
    assert get_res.status_code == 200
    get_doc = get_res.json()
    assert get_doc["id"] == doc["id"]
    assert get_doc["chunk_count"] == data["chunks_created"]


def test_ingest_txt_file_success(client: TestClient):
    txt_content = (
        "கிறிஸ்தவ வாழ்க்கையும் ஊழியமும் கூட்டப் புத்தகம் - நவம்பர் 2026\n\n"
        "பகுதி 1: கடவுளுடைய வார்த்தையிலுள்ள பொக்கிஷங்கள்.\n"
        "யெகோவா தம்முடைய ஊழியர்களுக்கு எப்போதும் ஆதரவாக இருக்கிறார்.\n\n"
        "பகுதி 2: வெளி ஊழியத்தில் திறமைகளை வளர்த்துக்கொள்ளுங்கள்.\n"
        "மக்கள் மீது அக்கறை காட்டுங்கள், அன்போடு சுவிசேஷத்தைப் பகிருங்கள்."
    ).encode("utf-8")

    files = {
        "file": ("mwb_ta_202611.txt", txt_content, "text/plain"),
    }
    data = {
        "title": "கூட்டப் புத்தகம் - நவம்பர் 2026",
        "source_type": "meeting_workbook",
        "source_url": "https://www.jw.org/ta/library/jw-meeting-workbook/november-2026/",
        "language": "ta",
    }
    response = client.post("/api/v1/knowledge/ingest", files=files, data=data)
    assert response.status_code == 201

    res_data = response.json()
    assert res_data["chunks_created"] >= 1
    doc = res_data["document"]
    assert doc["title"] == data["title"]
    assert doc["source_type"] == "meeting_workbook"
    assert doc["document_status"] == "indexed"
    assert doc["chunk_count"] >= 1


def test_ingest_pdf_file_success(client: TestClient):
    pdf_bytes = create_sample_pdf_bytes([
        "Chapter 1: The Creator of the Universe and His Name Jehovah",
        "Chapter 2: Why Does God Allow Suffering and Evil Today?",
    ])

    files = {
        "file": ("study_publication.pdf", pdf_bytes, "application/pdf"),
    }
    data = {
        "title": "Enjoy Life Forever Study Guide",
        "source_type": "manual",
        "source_url": "https://www.jw.org/en/library/books/enjoy-life-forever/",
        "language": "en",
    }
    response = client.post("/api/v1/knowledge/ingest", files=files, data=data)
    assert response.status_code == 201

    res_data = response.json()
    assert res_data["chunks_created"] >= 2
    doc = res_data["document"]
    assert doc["title"] == data["title"]
    assert doc["source_type"] == "manual"
    assert doc["document_status"] == "indexed"
    assert doc["chunk_count"] >= 2


def test_ingest_unsupported_file_extension(client: TestClient):
    files = {
        "file": ("script.py", b"print('hello world')", "text/x-python"),
    }
    data = {
        "title": "Unsupported Script",
        "source_type": "other",
    }
    response = client.post("/api/v1/knowledge/ingest", files=files, data=data)
    assert response.status_code == 400
    err = response.json()["error"]
    assert err["code"] == "UNSUPPORTED_FORMAT"


def test_ingest_empty_file(client: TestClient):
    files = {
        "file": ("blank.txt", b"", "text/plain"),
    }
    data = {
        "title": "Empty File Test",
        "source_type": "other",
    }
    response = client.post("/api/v1/knowledge/ingest", files=files, data=data)
    assert response.status_code == 400
    err = response.json()["error"]
    assert err["code"] == "EMPTY_FILE"


def test_ingest_empty_text_content(client: TestClient):
    payload = {
        "title": "Blank Content",
        "content": "   \n\t   ",
        "source_type": "other",
    }
    response = client.post("/api/v1/knowledge/ingest-text", json=payload)
    assert response.status_code == 422
    err = response.json()["error"]
    assert err["code"] == "VALIDATION_ERROR"


def test_list_documents_filtering(client: TestClient):
    # Retrieve all
    response = client.get("/api/v1/knowledge/documents")
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)
    assert len(items) >= 3

    # Filter by source_type = watchtower
    wt_res = client.get("/api/v1/knowledge/documents?source_type=watchtower")
    assert wt_res.status_code == 200
    wt_items = wt_res.json()
    for it in wt_items:
        assert it["source_type"] == "watchtower"

    # Filter by language = ta
    ta_res = client.get("/api/v1/knowledge/documents?language=ta")
    assert ta_res.status_code == 200
    ta_items = ta_res.json()
    for it in ta_items:
        assert it["language"] == "ta"

    # Test pagination
    page_res = client.get("/api/v1/knowledge/documents?limit=1&skip=0")
    assert page_res.status_code == 200
    page_items = page_res.json()
    assert len(page_items) == 1


def test_reindex_existing_document(client: TestClient):
    initial_payload = {
        "title": "மறுபதிவு சோதனை கட்டுரை",
        "content": "முதல் பதிப்பு: ஆரம்ப வாக்கியம்.",
        "source_type": "awake",
        "language": "ta",
    }
    res1 = client.post("/api/v1/knowledge/ingest-text", json=initial_payload)
    assert res1.status_code == 201
    doc_id = res1.json()["document"]["id"]

    # Re-ingest with updated content under the same title
    updated_payload = {
        "title": "மறுபதிவு சோதனை கட்டுரை",
        "content": (
            "இரண்டாம் பதிப்பு: விரிவான விளக்கம் மற்றும் கூடுதல் விவரங்கள்.\n\n"
            "இரண்டாவது பத்தி: மேலும் பல குறிப்புகள்."
        ),
        "source_type": "awake",
        "language": "ta",
    }
    res2 = client.post("/api/v1/knowledge/ingest-text", json=updated_payload)
    assert res2.status_code == 201
    doc2 = res2.json()["document"]

    # Must reuse the same document ID (re-indexing instead of duplicate creation)
    assert doc2["id"] == doc_id
    assert doc2["document_status"] == "indexed"
    assert doc2["chunk_count"] >= 1


def test_delete_document_and_cascade_chroma(client: TestClient):
    # Ingest a dedicated document to delete
    payload = {
        "title": "நீக்கப்பட வேண்டிய ஆவணம்",
        "content": "இந்த ஆவணம் சோதனையின் முடிவில் முழுமையாக நீக்கப்பட வேண்டும்.",
        "source_type": "other",
        "language": "ta",
    }
    create_res = client.post("/api/v1/knowledge/ingest-text", json=payload)
    assert create_res.status_code == 201
    doc_id = create_res.json()["document"]["id"]

    # Verify chunks exist in ChromaDB
    vector_store = get_vector_store()
    assert vector_store.count_document_chunks(doc_id) > 0

    # Delete document
    del_res = client.delete(f"/api/v1/knowledge/documents/{doc_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify document is gone from SQLite
    get_res = client.get(f"/api/v1/knowledge/documents/{doc_id}")
    assert get_res.status_code == 404

    # Verify all vector chunks were purged from ChromaDB
    assert vector_store.count_document_chunks(doc_id) == 0


def test_delete_non_existent_document(client: TestClient):
    response = client.delete("/api/v1/knowledge/documents/non-existent-uuid")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_chroma_persistence_across_instances():
    """
    Verifies that chunks persisted to disk survive client re-initialization.
    """
    store1 = get_vector_store()
    initial_total = store1.get_total_chunks()
    assert initial_total > 0

    # Instantiate a separate ChromaVectorStore client pointing to the same directory
    store2 = ChromaVectorStore(persist_directory=store1.persist_path)
    assert store2.get_total_chunks() == initial_total

    # Verify semantic query finds results
    results = store2.query_similar(query_text="ஜெபம் சமாதானம்", n_results=2)
    assert len(results) > 0
    assert "chunk_id" in results[0]
    assert "content" in results[0]


def test_semantic_search_query_similar():
    store = get_vector_store()
    results = store.query_similar(query_text="பாரத்தை இறக்கிவையுங்கள்", n_results=3)
    assert len(results) > 0
    assert "content" in results[0]
    assert "distance" in results[0]
    assert "metadata" in results[0]

