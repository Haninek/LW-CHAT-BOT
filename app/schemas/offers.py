"""Offer schemas for loan calculations."""

from typing import List

from pydantic import BaseModel, Field


class OfferTier(BaseModel):
    """Individual offer tier."""
    
    amount: float = Field(..., ge=0, description="Loan amount")
    fee_factor: float = Field(..., gt=1, description="Fee multiplier")
    term_days: int = Field(..., gt=0, description="Loan term in days")
    payback_amount: float = Field(..., ge=0, description="Total payback amount")
    rationale: str = Field(..., description="AI-generated rationale for this offer")


class OfferRequest(BaseModel):
    """Request schema for generating offers."""
    
    avg_monthly_revenue: float = Field(..., ge=0, description="Average monthly revenue")
    avg_daily_balance_3m: float = Field(..., description="Average daily balance over 3 months")
    total_nsf_3m: int = Field(..., ge=0, description="Total NSF count over 3 months")
    total_days_negative_3m: int = Field(..., ge=0, description="Total days negative over 3 months")


class OfferResponse(BaseModel):
    """Response schema for loan offers."""
    
    offers: List[OfferTier] = Field(..., description="Available loan offers")
    base_amount: float = Field(..., ge=0, description="Base calculation amount")
    rejection_reason: str = Field(None, description="Reason for rejection if no offers available")
    
    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "offers": [
                    {
                        "amount": 10800.0,
                        "fee_factor": 1.25,
                        "term_days": 120,
                        "payback_amount": 13500.0,
                        "rationale": "Conservative offer based on stable cash flow and minimal NSF history",
                    },
                    {
                        "amount": 14400.0,
                        "fee_factor": 1.30,
                        "term_days": 140,
                        "payback_amount": 18720.0,
                        "rationale": "Moderate offer reflecting good financial stability",
                    },
                    {
                        "amount": 18000.0,
                        "fee_factor": 1.35,
                        "term_days": 160,
                        "payback_amount": 24300.0,
                        "rationale": "Premium offer for businesses with strong financial performance",
                    },
                ],
                "base_amount": 18000.0,
            }
        }