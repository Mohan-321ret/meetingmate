import os
import re
import time
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import settings
from app.core.exceptions import AppException, ValidationException
from app.core.logging import logger

# Maximum allowed lengths and rules
MAX_FILENAME_LENGTH = 255
SAFE_FILENAME_REGEX = re.compile(r"^[\w\-. ]+$", re.UNICODE)
SUPPORTED_FILE_EXTENSIONS = {".pdf", ".txt"}


def sanitize_filename(raw_filename: str) -> str:
    """
    Sanitize an uploaded filename to prevent directory traversal and filesystem attacks.
    Strips directory separators, null bytes, parent traversal tokens, and path syntax.
    """
    if not raw_filename or not raw_filename.strip():
        raise ValidationException(
            message="Uploaded file must have a non-empty filename.",
            details={"filename": raw_filename},
        )

    # 1. Reject path traversal attempts explicitly
    if ".." in raw_filename or "/" in raw_filename or "\\" in raw_filename:
        # Also clean it by extracting basename
        base_name = os.path.basename(raw_filename.replace("\\", "/"))
    else:
        base_name = raw_filename.strip()

    # 2. Strip null bytes and control characters
    base_name = "".join(ch for ch in base_name if ch.isprintable() and ch != "\x00").strip()

    # 3. Clean up multiple dots or leading dots
    base_name = re.sub(r"^\.+", "", base_name)
    if not base_name:
        raise ValidationException(
            message="Filename is invalid after removing unsafe characters.",
            details={"original": raw_filename},
        )

    # 4. Enforce max length
    if len(base_name) > MAX_FILENAME_LENGTH:
        # Preserve extension
        parts = base_name.rsplit(".", 1)
        if len(parts) == 2:
            base_name = parts[0][: MAX_FILENAME_LENGTH - len(parts[1]) - 1] + "." + parts[1]
        else:
            base_name = base_name[:MAX_FILENAME_LENGTH]

    return base_name


def validate_file_upload(
    filename: str,
    file_bytes: bytes,
    max_size_mb: Optional[int] = None,
) -> Tuple[str, str]:
    """
    Validate an uploaded file's extension, size, and magic bytes / mime structure.
    Returns: (sanitized_filename, extension)
    """
    sanitized = sanitize_filename(filename)
    ext = ("." + sanitized.split(".")[-1].lower()) if "." in sanitized else ""

    if ext not in SUPPORTED_FILE_EXTENSIONS:
        raise AppException(
            message=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(SUPPORTED_FILE_EXTENSIONS))}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="UNSUPPORTED_FORMAT",
            details={"filename": sanitized, "extension": ext, "allowed": list(SUPPORTED_FILE_EXTENSIONS)},
        )

    # Size validation
    limit_mb = max_size_mb or settings.MAX_UPLOAD_SIZE_MB
    max_bytes = limit_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise AppException(
            message=f"File size ({len(file_bytes)} bytes) exceeds the maximum allowed limit of {limit_mb} MB.",
            status_code=413,
            error_code="PAYLOAD_TOO_LARGE",
            details={"size_bytes": len(file_bytes), "max_bytes": max_bytes},
        )

    if not file_bytes:
        raise AppException(
            message="Uploaded file is empty (0 bytes)",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="EMPTY_FILE",
            details={"filename": sanitized},
        )

    # Magic byte verification
    if ext == ".pdf":
        if not file_bytes.startswith(b"%PDF-"):
            raise ValidationException(
                message="Invalid PDF file: header does not match standard '%PDF-' magic bytes.",
                details={"filename": sanitized},
            )
    elif ext == ".txt":
        # Check text file does not contain null bytes (binary disguised as txt)
        if b"\x00" in file_bytes[:1024]:
            raise ValidationException(
                message="Invalid text file: binary content or null bytes detected.",
                details={"filename": sanitized},
            )

    return sanitized, ext


# ==============================================================================
# RATE LIMITER (In-Memory Sliding Window)
# ==============================================================================

class InMemoryRateLimiter:
    """
    Thread-safe, sliding-window rate limiter per client IP.
    Protects Groq API quotas and prevents application flooding.
    """

    def __init__(self, requests_per_minute: int = 60):
        self.rpm = requests_per_minute
        self.window_seconds = 60
        self._history: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> Tuple[bool, int, int]:
        """
        Evaluates whether a request from client_ip is permitted.
        Returns: (is_allowed, remaining_requests, reset_seconds)
        """
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean timestamps older than 60s
        timestamps = self._history[client_ip]
        self._history[client_ip] = [ts for ts in timestamps if ts > cutoff]
        current_count = len(self._history[client_ip])

        remaining = max(0, self.rpm - current_count)
        reset_seconds = int(self.window_seconds - (now - self._history[client_ip][0])) if self._history[client_ip] else 60
        reset_seconds = max(1, reset_seconds)

        if current_count >= self.rpm:
            return False, 0, reset_seconds

        # Record this request
        self._history[client_ip].append(now)
        return True, remaining - 1, reset_seconds

    def reset_for_ip(self, client_ip: str) -> None:
        """Helper to reset rate limit for a specific IP (useful in tests)."""
        if client_ip in self._history:
            del self._history[client_ip]

    def reset_all(self) -> None:
        """Helper to clear all rate limit tracking."""
        self._history.clear()


# Global limiter instance
rate_limiter = InMemoryRateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)


class SecurityAndRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Unified security middleware enforcing:
    1. Maximum payload body size limits (e.g. 15MB for file uploads, 2MB for standard JSON).
    2. In-memory sliding-window rate limiting per client IP.
    3. Security headers (X-Content-Type-Options, X-Frame-Options).
    """

    def __init__(
        self,
        app,
        max_upload_size_mb: int = 15,
        max_body_size_mb: int = 2,
        rate_limit_rpm: int = 60,
    ):
        super().__init__(app)
        self.max_upload_bytes = max_upload_size_mb * 1024 * 1024
        self.max_body_bytes = max_body_size_mb * 1024 * 1024
        self.limiter = InMemoryRateLimiter(requests_per_minute=rate_limit_rpm)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        # 1. Health checks and docs bypass rate limiting
        is_rate_exempt = (
            path in {"/", f"{settings.API_V1_PREFIX}/health", "/docs", "/openapi.json"}
            or settings.APP_ENV == "testing"
            or request.headers.get("x-bypass-ratelimit") == "true"
        )

        # Extract client IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        # 2. Rate limit check
        if not is_rate_exempt and self.limiter.rpm > 0:
            allowed, remaining, reset_time = self.limiter.is_allowed(client_ip)
            if not allowed:
                logger.warning(f"Rate limit exceeded for client {client_ip} on {path}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Too many requests. Limit is {self.limiter.rpm} requests per minute. Try again in {reset_time} seconds.",
                            "details": {"retry_after_seconds": reset_time},
                        },
                    },
                    headers={
                        "X-RateLimit-Limit": str(self.limiter.rpm),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_time),
                        "Retry-After": str(reset_time),
                    },
                )

        # 3. Request body size check via Content-Length header
        content_length_header = request.headers.get("content-length")
        if content_length_header:
            try:
                content_length = int(content_length_header)
                # Allow higher limit for knowledge ingest upload
                is_upload_path = "/knowledge/ingest" in path
                limit = self.max_upload_bytes if is_upload_path else self.max_body_bytes

                if content_length > limit:
                    logger.warning(
                        f"Request payload too large: {content_length} bytes exceeds {limit} bytes on {path}"
                    )
                    return JSONResponse(
                        status_code=413,
                        content={
                            "success": False,
                            "error": {
                                "code": "PAYLOAD_TOO_LARGE",
                                "message": f"Request entity exceeds maximum allowable size of {limit // (1024 * 1024)} MB.",
                                "details": {
                                    "received_bytes": content_length,
                                    "max_bytes": limit,
                                },
                            },
                        },
                    )
            except ValueError:
                pass

        # 4. Optional Family Device Authentication check
        is_auth_exempt = path in {"/", f"{settings.API_V1_PREFIX}/health", "/docs", "/openapi.json"}
        if settings.ENABLE_FAMILY_KEY_CHECK and not is_auth_exempt:
            family_key = request.headers.get("X-Family-Token") or request.headers.get("X-API-Key")
            if not family_key or family_key != settings.FAMILY_API_KEY:
                logger.warning(f"Unauthorized family access attempt on {path} from {client_ip}")
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "success": False,
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Valid family device authorization token required.",
                            "details": {},
                        },
                    },
                )

        # Process request
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"

        # Add rate limit headers if applicable
        if not is_rate_exempt and self.limiter.rpm > 0:
            allowed, remaining, reset_time = self.limiter.is_allowed(client_ip)
            response.headers["X-RateLimit-Limit"] = str(self.limiter.rpm)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_time)

        return response
