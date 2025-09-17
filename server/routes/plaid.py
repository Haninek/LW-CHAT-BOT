"""Plaid integration endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import settings

router = APIRouter()


class LinkTokenRequest(BaseModel):
    user_id: str
    merchant_name: str


class ExchangeTokenRequest(BaseModel):
    public_token: str


@router.post("/link-token")
async def create_link_token(request: LinkTokenRequest):
    """Create Plaid Link token for bank connection."""
    
    if settings.MOCK_MODE:
        return {
            "link_token": f"link-sandbox-mock-{request.user_id}",
            "expiration": "2024-01-01T00:00:00Z",
            "mock_mode": True
        }
    
    # TODO: Implement actual Plaid link token creation
    raise HTTPException(
        status_code=501,
        detail="Plaid integration requires API keys - currently in mock mode"
    )


@router.post("/exchange")
async def exchange_public_token(request: ExchangeTokenRequest):
    """Exchange public token for access token."""
    
    if settings.MOCK_MODE:
        return {
            "access_token": f"access-sandbox-mock-{request.public_token[:8]}",
            "item_id": f"mock-item-{request.public_token[:8]}",
            "mock_mode": True
        }
    
    # TODO: Implement actual token exchange
    raise HTTPException(
        status_code=501,
        detail="Plaid integration requires API keys - currently in mock mode"
    )


@router.post("/metrics")
async def get_plaid_metrics(access_token: str):
    """Get bank metrics from Plaid connection."""
    
    if settings.MOCK_MODE:
        return {
            "metrics": {
                "avg_monthly_revenue": 92000,
                "avg_daily_balance_3m": 18000,
                "total_nsf_3m": 1,
                "total_days_negative_3m": 1,
                "analysis_confidence": 0.98,
                "months_analyzed": 3,
                "data_source": "plaid_mock"
            },
            "mock_mode": True
        }
    
    # TODO: Implement actual Plaid metrics retrieval
    raise HTTPException(
        status_code=501,
        detail="Plaid integration requires API keys - currently in mock mode"
    )