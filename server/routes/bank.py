"""Bank document parsing endpoints."""

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
import random

from core.config import get_settings

settings = get_settings()

router = APIRouter()


@router.post("/parse")
async def parse_bank_statements(
    files: List[UploadFile] = File(...)
):
    """Parse exactly 3 PDF bank statements and extract metrics."""
    
    if len(files) != 3:
        raise HTTPException(
            status_code=400, 
            detail="Exactly 3 PDF files required"
        )
    
    # Validate PDF files
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="All files must be PDF format"
            )
    
    if settings.MOCK_MODE:
        # Return deterministic mock data
        return {
            "status": "success",
            "files_processed": len(files),
            "metrics": {
                "avg_monthly_revenue": 85000,
                "avg_daily_balance_3m": 15000,
                "total_nsf_3m": 2,
                "total_days_negative_3m": 3,
                "analysis_confidence": 0.95,
                "months_analyzed": 3
            },
            "mock_mode": True
        }
    
    else:
        # TODO: Implement actual PDF parsing
        # For now, return mock data with some randomization
        metrics = {
            "avg_monthly_revenue": random.randint(50000, 150000),
            "avg_daily_balance_3m": random.randint(8000, 25000),
            "total_nsf_3m": random.randint(0, 5),
            "total_days_negative_3m": random.randint(0, 10),
            "analysis_confidence": round(random.uniform(0.8, 1.0), 2),
            "months_analyzed": 3
        }
        
        return {
            "status": "success",
            "files_processed": len(files),
            "metrics": metrics,
            "mock_mode": False,
            "note": "PDF parsing not fully implemented - using sample data"
        }