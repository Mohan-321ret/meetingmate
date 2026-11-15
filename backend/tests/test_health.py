from fastapi.testclient import TestClient
from app.core.config import settings


def test_health_endpoint_returns_200_and_valid_schema(client: TestClient):
    """
    Test that GET /api/v1/health returns 200 OK with correct status and version.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION
    assert data["environment"] == settings.APP_ENV
    assert data["database"] == "connected"
    assert data["vector_db"] == "ready"
    assert "timestamp" in data


def test_root_endpoint_returns_metadata(client: TestClient):
    """
    Test that GET / returns application information and docs/health pointers.
    """
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == settings.APP_NAME
    assert data["version"] == settings.APP_VERSION
    assert data["health_check"] == f"{settings.API_V1_PREFIX}/health"


def test_cors_headers_present(client: TestClient):
    """
    Test that CORS headers are returned properly for API requests.
    """
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:8081"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ("*", "http://localhost:8081")


def test_not_found_endpoint(client: TestClient):
    """
    Test that an invalid route returns 404.
    """
    response = client.get("/api/v1/non_existent_route")
    assert response.status_code == 404
