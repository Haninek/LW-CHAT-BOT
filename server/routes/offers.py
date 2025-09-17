"""Offer generation endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import math

from core.database import get_db
from models.offer import Offer

router = APIRouter()


class OfferOverrides(BaseModel):
    tiers: List[Dict[str, Any]] = []
    caps: Dict[str, int] = {}
    buy_rate: Optional[float] = None


class GenerateOffersRequest(BaseModel):
    avg_monthly_revenue: float
    avg_daily_balance_3m: float
    total_nsf_3m: int
    total_days_negative_3m: int
    merchant_id: Optional[str] = None
    overrides: Optional[OfferOverrides] = None


@router.post("/")
async def generate_offers(
    request: GenerateOffersRequest,
    db: Session = Depends(get_db)
):
    """Generate funding offers based on metrics and overrides."""
    
    # Base offer calculation
    revenue = request.avg_monthly_revenue
    balance = request.avg_daily_balance_3m
    nsf_count = request.total_nsf_3m
    negative_days = request.total_days_negative_3m
    
    # Risk scoring (simplified)
    risk_score = 0.5  # Base score
    if nsf_count > 3:
        risk_score += 0.2
    if negative_days > 10:
        risk_score += 0.2
    if balance < revenue * 0.1:  # Less than 10% of monthly revenue
        risk_score += 0.15
    
    risk_score = min(risk_score, 1.0)
    
    # Default tiers if no overrides
    default_tiers = [
        {"factor": 0.8, "fee": 1.15, "term_days": 90, "buy_rate": 1.12},
        {"factor": 1.0, "fee": 1.20, "term_days": 120, "buy_rate": 1.16}, 
        {"factor": 1.2, "fee": 1.25, "term_days": 150, "buy_rate": 1.20}
    ]
    
    tiers = request.overrides.tiers if request.overrides and request.overrides.tiers else default_tiers
    offers = []
    
    for i, tier in enumerate(tiers[:3]):  # Max 3 offers
        # Calculate offer amount
        base_amount = revenue * tier["factor"]
        
        # Apply risk adjustment
        adjusted_amount = base_amount * (1 - risk_score * 0.3)
        
        # Round to nearest $100
        offer_amount = math.floor(adjusted_amount / 100) * 100
        
        # Calculate payback
        payback_amount = offer_amount * tier["fee"]
        
        # Calculate expected margin if buy_rate provided
        expected_margin = None
        if tier.get("buy_rate"):
            expected_margin = (tier["fee"] - tier["buy_rate"]) * offer_amount
        
        offer = {
            "id": str(uuid.uuid4()),
            "tier": i + 1,
            "amount": int(offer_amount),
            "factor": tier["factor"],
            "fee": tier["fee"],
            "payback_amount": int(payback_amount),
            "term_days": tier["term_days"],
            "buy_rate": tier.get("buy_rate"),
            "expected_margin": int(expected_margin) if expected_margin else None,
            "daily_payment": int(payback_amount / tier["term_days"]),
            "risk_score": round(risk_score, 2),
            "rationale": f"Based on ${int(revenue):,}/month revenue, {tier['term_days']}-day term"
        }
        
        offers.append(offer)
    
    # Save offers to database if merchant_id provided
    if request.merchant_id:
        for offer_data in offers:
            offer_record = Offer(
                id=offer_data["id"],
                merchant_id=request.merchant_id,
                payload_json=json.dumps(offer_data),
                status="pending"
            )
            db.add(offer_record)
        db.commit()
    
    return {
        "offers": offers,
        "metrics_used": {
            "avg_monthly_revenue": revenue,
            "avg_daily_balance_3m": balance,
            "total_nsf_3m": nsf_count,
            "total_days_negative_3m": negative_days,
            "calculated_risk_score": risk_score
        },
        "overrides_applied": request.overrides.dict() if request.overrides else None
    }