import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.core.exceptions import AppException, ValidationException, general_exception_handler
from app.core.security import (
    InMemoryRateLimiter,
    sanitize_filename,
    validate_file_upload,
)
from app.database.connection import engine


# ==============================================================================
# 1. FILENAME SANITIZATION & PATH TRAVERSAL PROTECTION
# ==============================================================================

def test_sanitize_filename_prevents_directory_traversal():
    """
    Verifies that directory traversals, relative paths, and dangerous separators are stripped.
    """
    # Linux-style path traversal
    assert sanitize_filename("../../../etc/passwd.txt") == "passwd.txt"
    assert sanitize_filename("../../secret.pdf") == "secret.pdf"

    # Windows-style path traversal
    assert sanitize_filename("..\\..\\windows\\system32\\hosts.txt") == "hosts.txt"

    # Preserves clean filenames
    assert sanitize_filename("study_article_2026.pdf") == "study_article_2026.pdf"
    assert sanitize_filename("meeting_notes_ta.txt") == "meeting_notes_ta.txt"


def test_sanitize_filename_strips_null_bytes_and_invalid_chars():
    """
    Verifies null bytes and dangerous control characters are stripped.
    """
    filename_with_null = "document\x00_name.pdf"
    sanitized = sanitize_filename(filename_with_null)
    assert "\x00" not in sanitized
    assert sanitized == "document_name.pdf"


def test_sanitize_filename_rejects_empty():
    """
    Verifies that empty or whitespace filenames raise a ValidationException.
    """
    with pytest.raises(ValidationException):
        sanitize_filename("")

    with pytest.raises(ValidationException):
        sanitize_filename("   ")


# ==============================================================================
# 2. FILE UPLOAD & MAGIC BYTES VALIDATION
# ==============================================================================

def test_validate_file_upload_rejects_disallowed_extensions():
    """
    Verifies that executable, script, or unsupported files are rejected.
    """
    for bad_name in ["malware.exe", "script.py", "payload.sh", "config.yaml", "archive.zip"]:
        with pytest.raises(AppException) as exc_info:
            validate_file_upload(bad_name, b"some content")
        assert "Unsupported file format" in str(exc_info.value)


def test_validate_file_upload_pdf_magic_bytes():
    """
    Verifies PDF files must start with the standard %PDF- magic bytes.
    """
    # Valid PDF magic bytes
    valid_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj"
    sanitized, ext = validate_file_upload("valid.pdf", valid_pdf_bytes)
    assert sanitized == "valid.pdf"
    assert ext == ".pdf"

    # Invalid PDF (disguised content)
    invalid_pdf_bytes = b"MZ\x90\x00\x03\x00\x00\x00This is not a real PDF"
    with pytest.raises(ValidationException) as exc_info:
        validate_file_upload("fake.pdf", invalid_pdf_bytes)
    assert "Invalid PDF file" in str(exc_info.value)


def test_validate_file_upload_txt_binary_detection():
    """
    Verifies text files containing null bytes (binary disguised as txt) are rejected.
    """
    # Valid text
    valid_txt = "இயேசுவின் ஜெப வாழ்க்கை பற்றிய குறிப்புகள்.".encode("utf-8")
    sanitized, ext = validate_file_upload("notes.txt", valid_txt)
    assert sanitized == "notes.txt"
    assert ext == ".txt"

    # Disguised binary in .txt
    binary_txt = b"Some text\x00\x01\x02\x03corrupted binary"
    with pytest.raises(ValidationException) as exc_info:
        validate_file_upload("fake.txt", binary_txt)
    assert "binary content or null bytes detected" in str(exc_info.value)


def test_validate_file_upload_size_limit():
    """
    Verifies file upload exceeding max_size_mb raises HTTP 413.
    """
    one_mb_bytes = b"A" * (1024 * 1024 + 10)
    # Set limit to 1MB
    with pytest.raises(AppException) as exc_info:
        validate_file_upload("large.txt", one_mb_bytes, max_size_mb=1)
    assert exc_info.value.status_code == 413
    assert exc_info.value.error_code == "PAYLOAD_TOO_LARGE"


# ==============================================================================
# 3. RATE LIMITER LOGIC
# ==============================================================================

def test_in_memory_rate_limiter():
    """
    Tests sliding window algorithm: allows up to limit, then rejects.
    """
    limiter = InMemoryRateLimiter(requests_per_minute=3)
    test_ip = "192.168.1.100"

    # First 3 requests should be allowed
    allowed1, rem1, _ = limiter.is_allowed(test_ip)
    assert allowed1 is True
    assert rem1 == 2

    allowed2, rem2, _ = limiter.is_allowed(test_ip)
    assert allowed2 is True
    assert rem2 == 1

    allowed3, rem3, _ = limiter.is_allowed(test_ip)
    assert allowed3 is True
    assert rem3 == 0

    # 4th request must be rejected
    allowed4, rem4, reset_sec = limiter.is_allowed(test_ip)
    assert allowed4 is False
    assert rem4 == 0
    assert reset_sec > 0

    # Resetting IP frees quota
    limiter.reset_for_ip(test_ip)
    allowed_again, _, _ = limiter.is_allowed(test_ip)
    assert allowed_again is True


# ==============================================================================
# 4. SQLITE WAL MODE & DATABASE PRAGMAS
# ==============================================================================

def test_sqlite_pragmas_configured():
    """
    Verifies that SQLite PRAGMAs (foreign keys, WAL mode, synchronous, busy timeout) are active.
    """
    with engine.connect() as conn:
        # Check foreign keys
        fk_status = conn.execute(text("PRAGMA foreign_keys;")).scalar()
        assert fk_status == 1

        # Check journal mode (WAL or memory/delete if overridden)
        journal_mode = conn.execute(text("PRAGMA journal_mode;")).scalar()
        assert str(journal_mode).lower() in ("wal", "memory")

        # Check synchronous mode (NORMAL is 1, FULL is 2)
        sync_mode = conn.execute(text("PRAGMA synchronous;")).scalar()
        assert sync_mode in (1, 2)

        # Check busy timeout is configured
        busy_to = conn.execute(text("PRAGMA busy_timeout;")).scalar()
        assert busy_to >= 5000


# ==============================================================================
# 5. PRODUCTION ERROR MASKING & SECURITY HEADERS
# ==============================================================================

def test_general_exception_handler_masks_details_in_production():
    """
    Verifies that unhandled exceptions mask internal paths, stack traces, and SQL queries
    when APP_DEBUG=False.
    """
    import asyncio
    request = MagicMock()
    request.method = "POST"
    request.url.path = "/api/v1/meetings"

    test_exc = RuntimeError("CRITICAL: SELECT * FROM credentials WHERE key='secret_token' failed at /var/www/secret.py")

    with patch.object(settings, "APP_DEBUG", False):
        response = asyncio.run(general_exception_handler(request, test_exc))
        assert response.status_code == 500

        import json
        body = json.loads(response.body.decode("utf-8"))
        assert body["success"] is False
        assert body["error"]["code"] == "INTERNAL_SERVER_ERROR"
        # Masked message: should not leak secret or paths
        assert "secret_token" not in body["error"]["message"]
        assert "/var/www/secret.py" not in body["error"]["message"]
        assert body["error"]["details"] == {}


def test_security_headers_present_on_api_responses(client: TestClient):
    """
    Verifies security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY)
    are returned on HTTP responses.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"


# ==============================================================================
# 6. PAYLOAD SIZE LIMIT VIA HTTP
# ==============================================================================

def test_oversized_payload_rejected_with_413(client: TestClient):
    """
    Verifies that requests exceeding the maximum body size limit return HTTP 413.
    """
    large_payload_bytes = b"x" * (3 * 1024 * 1024)  # 3MB exceeds 2MB limit
    response = client.post(
        "/api/v1/meetings",
        content=large_payload_bytes,
        headers={"Content-Type": "application/json", "Content-Length": str(len(large_payload_bytes))},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"


# ==============================================================================
# 7. FAMILY DEVICE AUTHORIZATION
# ==============================================================================

def test_family_token_auth_enforcement(client: TestClient):
    """
    Verifies that when ENABLE_FAMILY_KEY_CHECK=True:
    1. Requests without valid token return 401 Unauthorized.
    2. Requests with matching X-Family-Token succeed.
    """
    with patch.object(settings, "ENABLE_FAMILY_KEY_CHECK", True):
        with patch.object(settings, "FAMILY_API_KEY", "secure_family_pass_123"):
            # Request without token should fail with 401
            resp_unauth = client.get("/api/v1/meetings")
            assert resp_unauth.status_code == 401
            assert resp_unauth.json()["error"]["code"] == "UNAUTHORIZED"

            # Request with invalid token should fail with 401
            resp_wrong = client.get("/api/v1/meetings", headers={"X-Family-Token": "wrong_key"})
            assert resp_wrong.status_code == 401

            # Request with correct token should succeed
            resp_auth = client.get("/api/v1/meetings", headers={"X-Family-Token": "secure_family_pass_123"})
            assert resp_auth.status_code == 200

            # Health check endpoint should remain accessible without key for monitoring
            resp_health = client.get("/api/v1/health")
            assert resp_health.status_code == 200
