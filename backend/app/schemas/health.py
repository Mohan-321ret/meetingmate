from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """
    Schema for the health check response.
    """
    status: str = Field(..., description="Overall health status of the service")
    service: str = Field(default="jw-meetingmate-backend", description="Internal service identifier")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Current application version")
    environment: str = Field(..., description="Runtime environment (development/production)")
    timestamp: datetime = Field(..., description="Current server UTC timestamp")
    database: Optional[str] = Field(None, description="Primary database status")
    vector_db: Optional[str] = Field(None, description="ChromaDB status")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "app_name": "JW Meeting Assistant API",
                "version": "1.0.0",
                "environment": "development",
                "timestamp": "2026-11-15T06:00:00Z",
                "database": "connected",
                "vector_db": "ready",
            }
        }
    }
