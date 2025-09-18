"""Deal management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from core.database import get_db
from core.security import verify_partner_key
from models.deal import Deal
from models.merchant import Merchant
from models.document import Document
from models.metrics_snapshot import MetricsSnapshot
from core.config import settings

router = APIRouter(prefix="/api/deals", tags=["deals"])


class StartDealRequest(BaseModel):
    merchant_id: str
    funding_amount: Optional[float] = None


@router.post("/start")
async def start_deal(
    request: StartDealRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Start a deal for a merchant - reuse existing open deal if available."""
    
    # Verify merchant exists
    merchant = db.query(Merchant).filter(Merchant.id == request.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Check for existing open/active deal
    existing_deal = db.query(Deal).filter(
        Deal.merchant_id == request.merchant_id,
        Deal.status.in_(["open", "offer", "accepted"])
    ).order_by(Deal.created_at.desc()).first()
    
    if existing_deal:
        # Return existing deal instead of creating new one
        return {
            "deal_id": existing_deal.id,
            "merchant_id": existing_deal.merchant_id,
            "status": existing_deal.status,
            "funding_amount": existing_deal.funding_amount,
            "created_at": existing_deal.created_at.isoformat(),
            "reused": True
        }
    
    # Create new deal only if no open deal exists
    deal_id = str(uuid.uuid4())
    deal = Deal(
        id=deal_id,
        merchant_id=request.merchant_id,
        status="open",  # Changed from "active" to "open" for consistency
        funding_amount=request.funding_amount,
        created_at=datetime.utcnow()
    )
    
    db.add(deal)
    db.commit()
    db.refresh(deal)
    
    return {
        "deal_id": deal.id,
        "merchant_id": deal.merchant_id,
        "status": deal.status,
        "funding_amount": deal.funding_amount,
        "created_at": deal.created_at.isoformat(),
        "reused": False
    }


@router.get("/{deal_id}")
async def get_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get deal details."""
    
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {
        "deal_id": deal.id,
        "merchant_id": deal.merchant_id,
        "status": deal.status,
        "funding_amount": deal.funding_amount,
        "created_at": deal.created_at.isoformat()
    }


@router.get("/merchant/{merchant_id}")
async def get_merchant_deals(
    merchant_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Get all deals for a merchant."""
    
    deals = db.query(Deal).filter(Deal.merchant_id == merchant_id).order_by(Deal.created_at.desc()).all()
    
    return [
        {
            "deal_id": deal.id,
            "merchant_id": deal.merchant_id,
            "status": deal.status,
            "funding_amount": deal.funding_amount,
            "created_at": deal.created_at.isoformat()
        }
        for deal in deals
    ]


@router.post("/{deal_id}/metrics/recompute")
async def recompute_deal_metrics(
    deal_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Calculate and store financial metrics for a deal based on uploaded documents."""
    
    # Verify deal exists
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Check for bank statement documents
    documents = db.query(Document).filter(
        Document.deal_id == deal_id,
        Document.type == "bank_statement"
    ).all()
    
    if not documents:
        raise HTTPException(
            status_code=400, 
            detail="No bank statements found for this deal. Upload documents first."
        )
    
    # Mock financial analysis (in production this would parse the actual PDFs)
    if settings.MOCK_MODE:
        metrics_data = {
            "avg_monthly_revenue": 85000,
            "avg_daily_balance_3m": 15000,
            "total_nsf_3m": 2,
            "total_days_negative_3m": 3,
            "highest_balance": 25000,
            "lowest_balance": 5000,
            "total_deposits": 255000,
            "total_withdrawals": 240000,
            "deposit_frequency": 12.5,
            "analysis_confidence": 0.95,
            "months_analyzed": 3
        }
    else:
        # Generate realistic sample data (in production, parse actual documents)
        import random
        metrics_data = {
            "avg_monthly_revenue": random.randint(50000, 150000),
            "avg_daily_balance_3m": random.randint(8000, 25000),
            "total_nsf_3m": random.randint(0, 5),
            "total_days_negative_3m": random.randint(0, 10),
            "highest_balance": random.randint(30000, 50000),
            "lowest_balance": random.randint(1000, 8000),
            "total_deposits": random.randint(200000, 500000),
            "total_withdrawals": random.randint(180000, 480000),
            "deposit_frequency": round(random.uniform(8.0, 15.0), 1),
            "analysis_confidence": round(random.uniform(0.8, 1.0), 2),
            "months_analyzed": 3
        }
    
    # Create metrics snapshot
    snapshot_id = str(uuid.uuid4())
    metrics_snapshot = MetricsSnapshot(
        id=snapshot_id,
        deal_id=deal_id,
        source="bank_statements",
        months_analyzed=metrics_data["months_analyzed"],
        avg_monthly_revenue=metrics_data["avg_monthly_revenue"],
        avg_daily_balance_3m=metrics_data["avg_daily_balance_3m"],
        total_nsf_3m=metrics_data["total_nsf_3m"],
        total_days_negative_3m=metrics_data["total_days_negative_3m"],
        highest_balance=metrics_data["highest_balance"],
        lowest_balance=metrics_data["lowest_balance"],
        total_deposits=metrics_data["total_deposits"],
        total_withdrawals=metrics_data["total_withdrawals"],
        deposit_frequency=metrics_data["deposit_frequency"],
        analysis_confidence=metrics_data["analysis_confidence"],
        flags_json="[]",  # No flags for now
        raw_metrics_json=str(metrics_data),
        created_at=datetime.utcnow()
    )
    
    # Update document parsing status
    for doc in documents:
        doc.parsing_status = "completed"
        doc.parsing_confidence = metrics_data["analysis_confidence"]
    
    db.add(metrics_snapshot)
    db.commit()
    
    return {
        "status": "success",
        "deal_id": deal_id,
        "snapshot_id": snapshot_id,
        "metrics": metrics_data,
        "documents_analyzed": len(documents),
        "source": "bank_statements",
        "created_at": metrics_snapshot.created_at.isoformat(),
        "mock_mode": settings.MOCK_MODE
    }