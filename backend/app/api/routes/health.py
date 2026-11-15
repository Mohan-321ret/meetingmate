from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings, BASE_DIR
from app.core.logging import logger
from app.database.connection import get_db
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Returns backend health status, application name, version, and dependency readiness.",
)
def check_health(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Perform a health check on the backend and underlying data stores.
    """
    db_status = "connected"
    try:
        # Verify primary database connection with a fast lightweight query
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        db_status = "degraded"

    # Verify vector database directory readiness
    vector_db_status = "ready"
    try:
        chroma_dir = Path(settings.CHROMA_PERSIST_DIRECTORY)
        if not chroma_dir.is_absolute():
            chroma_dir = BASE_DIR / settings.CHROMA_PERSIST_DIRECTORY
        chroma_dir.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        logger.error(f"ChromaDB directory check failed: {exc}")
        vector_db_status = "degraded"

    overall_status = "healthy" if db_status == "connected" and vector_db_status == "ready" else "degraded"

    return HealthResponse(
        status=overall_status,
        service="jw-meetingmate-backend",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        vector_db=vector_db_status,
    )
