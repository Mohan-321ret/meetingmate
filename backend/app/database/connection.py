import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings, BASE_DIR
from app.core.logging import logger

effective_db_url = settings.get_effective_database_url()

# SQLite connect args
connect_args = {"check_same_thread": False} if effective_db_url.startswith("sqlite") else {}

engine = create_engine(
    effective_db_url,
    connect_args=connect_args,
    echo=settings.APP_DEBUG and settings.APP_ENV == "development",
    pool_pre_ping=True,
    pool_recycle=3600,
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Ensure SQLite enforces foreign key constraints and optimizes performance with WAL mode.
    """
    if effective_db_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        if settings.SQLITE_WAL_MODE:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")  # 64 MB cache
            cursor.execute("PRAGMA temp_store=MEMORY")
        if settings.SQLITE_BUSY_TIMEOUT_MS:
            cursor.execute(f"PRAGMA busy_timeout={settings.SQLITE_BUSY_TIMEOUT_MS}")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a transactional database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database tables and verify connection on application startup.
    Ensures backwards-compatible column additions for existing SQLite databases.
    """
    try:
        # Create tables from Base metadata
        Base.metadata.create_all(bind=engine)

        # Ensure newly added columns exist in existing SQLite databases
        if effective_db_url.startswith("sqlite"):
            with engine.connect() as conn:
                # 1. search_history.answer_type and search_history.sources_json
                res = conn.exec_driver_sql("PRAGMA table_info(search_history)").fetchall()
                col_names = {row[1] for row in res}
                if "answer_type" not in col_names:
                    conn.exec_driver_sql("ALTER TABLE search_history ADD COLUMN answer_type VARCHAR(50) DEFAULT 'short'")
                if "sources_json" not in col_names:
                    conn.exec_driver_sql("ALTER TABLE search_history ADD COLUMN sources_json TEXT")

                # 2. answers.sources_json
                ans_res = conn.exec_driver_sql("PRAGMA table_info(answers)").fetchall()
                ans_cols = {row[1] for row in ans_res}
                if "sources_json" not in ans_cols:
                    conn.exec_driver_sql("ALTER TABLE answers ADD COLUMN sources_json TEXT")

                conn.commit()

        logger.info(f"Database initialized successfully: {effective_db_url}")
    except Exception as exc:
        logger.error(f"Failed to initialize database: {exc}", exc_info=True)
        raise
