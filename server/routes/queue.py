"""Queue management endpoints for background job processing."""

import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db
from core.security import verify_partner_key

router = APIRouter()

# Redis connection will be initialized when available
_redis_pool = None


async def get_redis():
    """Get Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        try:
            from arq.connections import create_pool, RedisSettings
            redis_settings = RedisSettings(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                database=int(os.getenv("REDIS_DB", "0"))
            )
            _redis_pool = await create_pool(redis_settings)
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="Redis/Arq not available - install with: pip install arq redis"
            )
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"Redis connection failed: {str(e)}"
            )
    return _redis_pool


class ParseJobRequest(BaseModel):
    deal_id: str
    priority: Optional[int] = 0


class BackgroundJobRequest(BaseModel):
    deal_id: str
    merchant_id: str
    priority: Optional[int] = 0


class SMSBatchRequest(BaseModel):
    messages: List[dict]
    campaign_name: str = "batch"
    priority: Optional[int] = 0


class OffersJobRequest(BaseModel):
    deal_id: str
    metrics: dict
    priority: Optional[int] = 0


@router.post("/parse")
async def queue_parse_statements(
    request: ParseJobRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Queue bank statement parsing job."""
    try:
        redis = await get_redis()
        job = await redis.enqueue_job(
            "parse_statements",
            request.deal_id,
            _job_timeout=300,
            _queue_name=f"parse_priority_{request.priority}"
        )
        
        return {
            "success": True,
            "job_id": job.job_id,
            "deal_id": request.deal_id,
            "status": "queued"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {str(e)}")


@router.post("/background")
async def queue_background_check(
    request: BackgroundJobRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Queue comprehensive background check job."""
    try:
        redis = await get_redis()
        job = await redis.enqueue_job(
            "run_clear",
            request.deal_id,
            request.merchant_id,
            _job_timeout=180,
            _queue_name=f"background_priority_{request.priority}"
        )
        
        return {
            "success": True,
            "job_id": job.job_id,
            "deal_id": request.deal_id,
            "merchant_id": request.merchant_id,
            "status": "queued"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {str(e)}")


@router.post("/sms")
async def queue_sms_batch(
    request: SMSBatchRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Queue SMS batch sending job."""
    try:
        redis = await get_redis()
        job = await redis.enqueue_job(
            "send_sms_batch",
            request.messages,
            request.campaign_name,
            _job_timeout=120,
            _queue_name=f"sms_priority_{request.priority}"
        )
        
        return {
            "success": True,
            "job_id": job.job_id,
            "campaign_name": request.campaign_name,
            "message_count": len(request.messages),
            "status": "queued"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {str(e)}")


@router.post("/offers")
async def queue_offers_generation(
    request: OffersJobRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_partner_key)
):
    """Queue offer generation job."""
    try:
        redis = await get_redis()
        job = await redis.enqueue_job(
            "generate_offers",
            request.deal_id,
            request.metrics,
            _job_timeout=60,
            _queue_name=f"offers_priority_{request.priority}"
        )
        
        return {
            "success": True,
            "job_id": job.job_id,
            "deal_id": request.deal_id,
            "status": "queued"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue job: {str(e)}")


@router.get("/status/{job_id}")
async def get_job_status(
    job_id: str,
    _: bool = Depends(verify_partner_key)
):
    """Get status of a queued job."""
    try:
        redis = await get_redis()
        
        # Get job info from Redis
        job_key = f"arq:job:{job_id}"
        job_data = await redis.hgetall(job_key)
        
        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            "status": job_data.get("status", "unknown"),
            "queued_at": job_data.get("queued_at"),
            "started_at": job_data.get("started_at"),
            "finished_at": job_data.get("finished_at"),
            "result": job_data.get("result"),
            "error": job_data.get("error")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")


@router.get("/stats")
async def get_queue_stats(
    _: bool = Depends(verify_partner_key)
):
    """Get queue statistics."""
    try:
        redis = await get_redis()
        
        # Get basic Redis info
        info = await redis.info()
        
        return {
            "connected": True,
            "redis_version": info.get("redis_version"),
            "connected_clients": info.get("connected_clients"),
            "used_memory_human": info.get("used_memory_human"),
            "total_connections_received": info.get("total_connections_received"),
            "uptime_in_seconds": info.get("uptime_in_seconds")
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }