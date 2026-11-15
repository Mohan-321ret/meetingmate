from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory: backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """
    Central application configuration loaded from environment variables and .env file.
    """
    # Application Info
    APP_NAME: str = "JW Meeting Assistant API"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS Settings
    ALLOWED_ORIGINS: Union[str, List[str]] = "*"

    # Primary Database (SQLite)
    DATABASE_URL: str = "sqlite:///./data/app.db"
    SQLITE_WAL_MODE: bool = True
    SQLITE_BUSY_TIMEOUT_MS: int = 5000

    # Vector Database (ChromaDB)
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma"
    CHROMA_ANONYMIZED_TELEMETRY: bool = False

    # LLM Settings (Groq API)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT: float = 30.0
    GROQ_MAX_RETRIES: int = 2
    GROQ_TEMPERATURE: float = 0.3

    # Security & Protection Settings
    MAX_UPLOAD_SIZE_MB: int = 15
    MAX_REQUEST_BODY_SIZE_MB: int = 2
    RATE_LIMIT_PER_MINUTE: int = 60
    FAMILY_API_KEY: str = ""
    ENABLE_FAMILY_KEY_CHECK: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["*"]

    def get_database_path(self) -> Path:
        """
        Returns the absolute filesystem Path for the SQLite database file.
        """
        if self.DATABASE_URL.startswith("sqlite:///"):
            raw_path = self.DATABASE_URL.replace("sqlite:///", "")
            p = Path(raw_path)
            if not p.is_absolute():
                p = (BASE_DIR / p).resolve()
            return p
        return BASE_DIR / "data" / "app.db"

    def get_effective_database_url(self) -> str:
        """
        Returns SQLAlchemy-compatible SQLite connection URL with absolute path.
        """
        if self.DATABASE_URL.startswith("sqlite:///"):
            db_path = self.get_database_path()
            db_path.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite:///{db_path.as_posix()}"
        return self.DATABASE_URL

    def get_chroma_path(self) -> Path:
        """
        Returns the absolute filesystem Path for the ChromaDB persist directory.
        """
        p = Path(self.CHROMA_PERSIST_DIRECTORY)
        if not p.is_absolute():
            p = (BASE_DIR / p).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
