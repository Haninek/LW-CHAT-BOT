"""Health check endpoints."""

import os
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/healthz")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "OK",
        "service": "Underwriting Wizard API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "port": os.getenv("PORT", "8000"),
        "railway_env": os.getenv("RAILWAY_ENVIRONMENT_NAME", "local")
    }


@router.get("/readyz")
async def readiness_check():
    """Readiness check endpoint."""
    return {
        "status": "Ready",
        "service": "Underwriting Wizard API",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "database": "OK",
            "external_services": "OK"
        }
    }