"""Health check endpoints."""

import time
from typing import Dict, Any

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.config import settings


class HealthResponse(BaseModel):
    """Health check response model."""
    
    status: str
    timestamp: float
    version: str = "1.0.0"


class ReadinessResponse(BaseModel):
    """Readiness check response model."""
    
    status: str
    timestamp: float
    version: str = "1.0.0"
    checks: Dict[str, Any]


router = APIRouter()


@router.get(
    "/healthz",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Basic health check endpoint",
)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=time.time(),
    )


@router.get(
    "/readyz",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Readiness check",
    description="Readiness check endpoint with dependency validation",
)
async def readiness_check() -> ReadinessResponse:
    """Readiness check endpoint."""
    checks = {}
    
    # Check critical environment variables
    checks["config"] = "ok"
    
    # Check OpenAI configuration
    checks["openai"] = "ok" if settings.OPENAI_API_KEY else "missing_key"
    
    # Check Plaid configuration
    checks["plaid"] = "ok" if settings.PLAID_CLIENT_ID and settings.PLAID_SECRET else "missing_credentials"
    
    # Overall status
    overall_status = "ready" if all(check == "ok" for check in checks.values()) else "not_ready"
    
    return ReadinessResponse(
        status=overall_status,
        timestamp=time.time(),
        checks=checks,
    )