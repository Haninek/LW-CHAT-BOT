"""Offer generation endpoints."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query, Body
from sqlalchemy.orm import Session
from core.database import get_db
from core.idempotency import capture_body, require_idempotency, store_idempotent
from core.auth import require_bearer, require_partner

# Existing specific imports
from pydantic import BaseModel
import uuid
import json
import math
from models.offer import Offer
from models.deal import Deal
from models.metrics_snapshot import MetricsSnapshot
from services.underwriting import underwriting_guardrails, UnderwritingDecision

router = APIRouter()


class OfferOverrides(BaseModel):
    tiers: List[Dict[str, Any]] = []
    caps: Dict[str, int] = {}
    buy_rate: Optional[float] = None


class GenerateOffersRequest(BaseModel):
    deal_id: str
    avg_monthly_revenue: Optional[float] = None
    avg_daily_balance_3m: Optional[float] = None
    total_nsf_3m: Optional[int] = None
    total_days_negative_3m: Optional[int] = None
    overrides: Optional[OfferOverrides] = None


@router.post("/", dependencies=[Depends(capture_body)])
async def generate_offers(
    req: Request,
    request: GenerateOffersRequest,
    tenant_id=Depends(require_idempotency),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generate funding offers for a deal based on latest metrics with underwriting guardrails."""
    
    if getattr(req.state, "idem_cached", None):
        return req.state.idem_cached
    
    # Verify deal exists
    deal = db.get(Deal, request.deal_id)
    if not deal:
        return {"error": "Deal not found", "deal_id": request.deal_id}
    
    # Get latest metrics snapshot for the deal or use provided values
    if any([request.avg_monthly_revenue, request.avg_daily_balance_3m, 
            request.total_nsf_3m, request.total_days_negative_3m]):
        # Use provided metrics
        metrics = {
            "avg_monthly_revenue": request.avg_monthly_revenue,
            "avg_daily_balance_3m": request.avg_daily_balance_3m,
            "total_nsf_3m": request.total_nsf_3m,
            "total_days_negative_3m": request.total_days_negative_3m
        }
    else:
        # Get latest metrics snapshot for this deal
        latest_snapshot = db.query(MetricsSnapshot).filter(
            MetricsSnapshot.deal_id == request.deal_id
        ).order_by(MetricsSnapshot.created_at.desc()).first()
        
        if not latest_snapshot:
            return {
                "error": "No metrics available for this deal. Upload bank statements and recompute metrics first.",
                "deal_id": request.deal_id
            }
        
        metrics = {
            "avg_monthly_revenue": latest_snapshot.avg_monthly_revenue,
            "avg_daily_balance_3m": latest_snapshot.avg_daily_balance_3m,
            "total_nsf_3m": latest_snapshot.total_nsf_3m,
            "total_days_negative_3m": latest_snapshot.total_days_negative_3m
        }
    
    # Run underwriting guardrails validation
    
    underwriting_result = underwriting_guardrails.evaluate_metrics(metrics, "CA")
    
    # Check if deal should be declined
    if underwriting_result.decision == UnderwritingDecision.DECLINED:
        return {
            "offers": [],
            "underwriting_decision": "declined",
            "decline_reasons": underwriting_result.reasons,
            "violations": [
                {
                    "rule_id": v.rule_id,
                    "description": v.description,
                    "severity": v.severity.value,
                    "actual_value": v.actual_value,
                    "threshold_value": v.threshold_value
                }
                for v in underwriting_result.violations
            ],
            "risk_score": underwriting_result.risk_score,
            "ca_compliant": underwriting_result.ca_compliant
        }
    
    # Check if manual review required
    if underwriting_result.decision == UnderwritingDecision.MANUAL_REVIEW:
        return {
            "offers": [],
            "underwriting_decision": "manual_review",
            "reasons": underwriting_result.reasons,
            "violations": [
                {
                    "rule_id": v.rule_id,
                    "description": v.description,
                    "severity": v.severity.value,
                    "actual_value": v.actual_value,
                    "threshold_value": v.threshold_value
                }
                for v in underwriting_result.violations
            ],
            "risk_score": underwriting_result.risk_score,
            "message": "This application requires manual underwriting review before offers can be generated"
        }
    
    # Base offer calculation with null checks
    revenue = request.avg_monthly_revenue or metrics.get("avg_monthly_revenue") or 0.0
    balance = request.avg_daily_balance_3m or metrics.get("avg_daily_balance_3m") or 0.0
    nsf_count = request.total_nsf_3m or metrics.get("total_nsf_3m") or 0
    negative_days = request.total_days_negative_3m or metrics.get("total_days_negative_3m") or 0
    
    # Ensure we have minimum revenue for calculations
    if revenue <= 0:
        return {"error": "Revenue data required for offer generation", "deal_id": request.deal_id}
    
    # Risk scoring (simplified)
    risk_score = 0.5  # Base score
    if nsf_count and nsf_count > 3:
        risk_score += 0.2
    if negative_days and negative_days > 10:
        risk_score += 0.2
    if balance and balance < revenue * 0.1:  # Less than 10% of monthly revenue
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
        
        # Apply underwriting max offer amount limit
        if underwriting_result.max_offer_amount:
            base_amount = min(base_amount, underwriting_result.max_offer_amount)
        
        # Apply risk adjustment (use underwriting risk score)
        underwriting_risk = underwriting_result.risk_score
        adjusted_amount = base_amount * (1 - underwriting_risk * 0.3)
        
        # Round to nearest $100
        offer_amount = math.floor(adjusted_amount / 100) * 100
        
        # Calculate payback
        payback_amount = offer_amount * tier["fee"]
        
        # Calculate expected margin if buy_rate provided
        expected_margin = None
        if tier.get("buy_rate"):
            expected_margin = (tier["fee"] - tier["buy_rate"]) * offer_amount
        
        # Validate deal terms for compliance
        terms_valid, term_issues = underwriting_guardrails.validate_deal_terms(
            deal_amount=offer_amount,
            fee_rate=tier["fee"],
            term_days=tier["term_days"],
            monthly_revenue=float(revenue),
            state="CA"
        )
        
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
            "risk_score": round(underwriting_risk, 2),
            "underwriting_decision": underwriting_result.decision.value,
            "terms_compliant": terms_valid,
            "compliance_issues": term_issues,
            "rationale": f"Based on ${int(float(revenue)):,}/month revenue, {tier['term_days']}-day term"
        }
        
        offers.append(offer)
    
    # Save offers to database tied to deal
    for offer_data in offers:
        offer_record = Offer(
            id=offer_data["id"],
            deal_id=request.deal_id,
            merchant_id=deal.merchant_id,  # Keep for compatibility
            payload_json=json.dumps(offer_data),
            status="pending"
        )
        db.add(offer_record)
    
    # Log offer generation event
    from models.event import Event
    db.add(Event(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        merchant_id=deal.merchant_id,
        deal_id=request.deal_id,
        type="offer.generated",
        data_json=json.dumps({"count": len(offers), "underwriting_decision": underwriting_result.decision.value})
    ))
    
    db.commit()
    
    resp = {
        "offers": offers,
        "underwriting_decision": underwriting_result.decision.value,
        "underwriting_summary": {
            "approved": underwriting_result.decision == UnderwritingDecision.APPROVED,
            "risk_score": underwriting_result.risk_score,
            "ca_compliant": underwriting_result.ca_compliant,
            "max_offer_amount": underwriting_result.max_offer_amount,
            "violation_count": len(underwriting_result.violations),
            "reasons": underwriting_result.reasons
        },
        "metrics_used": {
            "avg_monthly_revenue": revenue,
            "avg_daily_balance_3m": balance,
            "total_nsf_3m": nsf_count,
            "total_days_negative_3m": negative_days,
            "underwriting_risk_score": underwriting_result.risk_score
        },
        "overrides_applied": request.overrides.dict() if request.overrides else None
    }
    
    await store_idempotent(req, resp)
    return resp


@router.post("/deals/{deal_id}/accept", dependencies=[Depends(capture_body)])
async def accept_offer(
    req: Request,
    deal_id: str,
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency)
) -> Dict[str, Any]:
    """Accept an offer for a deal with idempotency and event logging."""
    
    if getattr(req.state, "idem_cached", None):
        return req.state.idem_cached
    
    # Verify deal exists
    deal = db.get(Deal, deal_id)
    if not deal:
        return {"error": "Deal not found", "deal_id": deal_id}
    
    # Update deal status
    deal.status = "accepted"
    
    # Log offer acceptance event
    from models.event import Event
    db.add(Event(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        merchant_id=deal.merchant_id,
        deal_id=deal_id,
        type="offer.accepted",
        data_json=json.dumps({
            "deal_id": deal_id,
            "tenant_id": tenant_id,
            "timestamp": deal.updated_at.isoformat() if deal.updated_at else None
        })
    ))
    
    db.commit()
    
    resp = {
        "deal_id": deal_id,
        "status": "accepted",
        "message": "Offer accepted successfully"
    }
    
    await store_idempotent(req, resp)
    return resp


@router.post("/deals/{deal_id}/decline", dependencies=[Depends(capture_body)])
async def decline_offer(
    req: Request,
    deal_id: str,
    db: Session = Depends(get_db),
    tenant_id=Depends(require_idempotency)
) -> Dict[str, Any]:
    """Decline an offer for a deal with idempotency and event logging."""
    
    if getattr(req.state, "idem_cached", None):
        return req.state.idem_cached
    
    # Verify deal exists
    deal = db.get(Deal, deal_id)
    if not deal:
        return {"error": "Deal not found", "deal_id": deal_id}
    
    # Update deal status
    deal.status = "declined"
    
    # Log offer decline event
    from models.event import Event
    db.add(Event(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        merchant_id=deal.merchant_id,
        deal_id=deal_id,
        type="offer.declined",
        data_json=json.dumps({
            "deal_id": deal_id,
            "tenant_id": tenant_id,
            "timestamp": deal.updated_at.isoformat() if deal.updated_at else None
        })
    ))
    
    db.commit()
    
    resp = {
        "deal_id": deal_id,
        "status": "declined",
        "message": "Offer declined successfully"
    }
    
    await store_idempotent(req, resp)
    return resp