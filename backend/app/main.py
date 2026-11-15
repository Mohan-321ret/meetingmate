from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.api import api_router
from app.core.config import settings, BASE_DIR
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    general_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger, setup_logging
from app.core.security import SecurityAndRateLimitMiddleware
from app.database.connection import engine, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle manager.
    """
    # ==================== STARTUP ====================
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.APP_ENV}]")

    # 1. Initialize Primary Database (SQLite)
    try:
        init_db()
    except Exception as exc:
        logger.error(f"Database initialization failed during startup: {exc}")

    # 2. Ensure Vector Store (ChromaDB) directory exists
    try:
        chroma_path = settings.get_chroma_path()
        logger.info(f"Vector DB directory verified at: {chroma_path}")
    except Exception as exc:
        logger.error(f"Failed to prepare Chroma directory: {exc}")

    logger.info("Application startup sequence completed successfully.")

    yield

    # ==================== SHUTDOWN ====================
    logger.info(f"Shutting down {settings.APP_NAME}...")
    try:
        engine.dispose()
        logger.info("Database connection engine disposed cleanly.")
    except Exception as exc:
        logger.warning(f"Error disposing database engine: {exc}")

    logger.info("Shutdown sequence completed.")


def create_application() -> FastAPI:
    """
    Application factory configuring middleware, exception handlers, and API routes.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="REST backend service for the JW Meeting Assistant mobile application.",
        debug=settings.APP_DEBUG,
        lifespan=lifespan,
    )

    # 1. Configure CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Register Security, Rate Limiting, and Payload Size Limiting Middleware
    app.add_middleware(
        SecurityAndRateLimitMiddleware,
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_MB,
        max_body_size_mb=settings.MAX_REQUEST_BODY_SIZE_MB,
        rate_limit_rpm=settings.RATE_LIMIT_PER_MINUTE,
    )

    # 3. Register Centralized Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # 4. Mount API Routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # 4. Root information endpoint
    @app.get("/", tags=["Root"])
    def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.APP_ENV,
            "docs_url": "/docs",
            "health_check": f"{settings.API_V1_PREFIX}/health",
        }

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.APP_DEBUG,
    )
