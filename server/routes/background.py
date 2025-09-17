"""Background check endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import json

from core.database import get_db
from core.config import settings
from models.background_job import BackgroundJob

router = APIRouter()


class BackgroundCheckRequest(BaseModel):
    merchant_id: str
    person: dict  # {first, last, dob, ssn4}


@router.post("/check")
async def start_background_check(
    request: BackgroundCheckRequest,
    db: Session = Depends(get_db)
):
    """Start background check via CLEAR."""
    
    job_id = str(uuid.uuid4())
    
    # Create job record
    job = BackgroundJob(
        merchant_id=request.merchant_id,
        status="pending"
    )
    db.add(job)
    db.commit()
    
    if settings.MOCK_MODE:
        # Simulate immediate completion with mock result
        mock_result = {
            "decision": "OK",  # OK, Review, Decline
            "notes": [
                "Identity verification: PASS",
                "Criminal background: CLEAR", 
                "Credit score: 720 (Good)"
            ],
            "mock_mode": True,
            "confidence": 0.95
        }
        
        job.status = "completed"
        job.result_json = json.dumps(mock_result)
        db.commit()
        
        return {
            "job_id": job.id,
            "status": "completed",
            "result": mock_result
        }
    
    else:
        # TODO: Implement actual CLEAR integration
        return {
            "job_id": job.id,
            "status": "pending",
            "message": "Background check started - check status for results"
        }


@router.get("/jobs/{job_id}")
async def get_background_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get background check job status and results."""
    
    job = db.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    result = None
    if job.result_json:
        result = json.loads(job.result_json)
    
    return {
        "job_id": job.id,
        "merchant_id": job.merchant_id,
        "status": job.status,
        "result": result,
        "created_at": job.created_at.isoformat()
    }