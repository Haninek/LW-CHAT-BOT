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
    """Parse minimum 3 PDF bank statements and extract metrics."""
    
    if len(files) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Minimum 3 PDF bank statements required (3+ months)"
        )
    
    if len(files) > 12:
        raise HTTPException(
            status_code=400,
            detail="Maximum 12 PDF bank statements allowed (12 months max)"
        )
    
    # Validate PDF files
    for file in files:
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="All files must be PDF format"
            )
    
    if settings.MOCK_MODE:
        # Return deterministic mock data in frontend-expected format
        return {
            "success": True,
            "data": {
                "metrics": {
                    "avg_monthly_revenue": 85000,
                    "avg_daily_balance_3m": 15000,
                    "total_nsf_3m": 2,
                    "total_days_negative_3m": 3,
                    "analysis_confidence": 0.95,
                    "months_analyzed": len(files)
                },
                "files_processed": len(files),
                "analysis_type": "mock_data"
            }
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
            "months_analyzed": len(files)
        }
        
        return {
            "success": True,
            "data": {
                "metrics": metrics,
                "files_processed": len(files),
                "analysis_type": "sample_data"
            }
        }