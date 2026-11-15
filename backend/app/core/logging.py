import logging
import sys
from app.core.config import settings


def setup_logging() -> None:
    """
    Configure application-wide structured logging format and log levels.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s"
    )
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )

    # Suppress overly chatty third-party loggers if not in DEBUG
    if not settings.APP_DEBUG:
        for quiet_logger in ("uvicorn.access", "chromadb", "httpx"):
            logging.getLogger(quiet_logger).setLevel(logging.WARNING)


logger = logging.getLogger("app")
