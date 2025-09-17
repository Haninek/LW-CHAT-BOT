"""Health check endpoints."""

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
        "version": "1.0.0"
    }