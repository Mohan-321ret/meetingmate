import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings

# Configure test environment
settings.APP_ENV = "testing"
test_db_path = BACKEND_DIR / "data" / "test.db"
settings.DATABASE_URL = f"sqlite:///{test_db_path.as_posix()}"

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """
    Provide an initialized TestClient that triggers lifespan events.
    """
    with TestClient(app) as test_client:
        yield test_client
