"""Background job workers for Redis + Arq processing."""

import os
import asyncio
import httpx
import json
from typing import List
from arq import cron
from arq.connections import RedisSettings

# Configuration
API_BASE = os.getenv("API_BASE", "http://localhost:8000")
CHERRY_BASE = os.getenv("CHERRY_BASE")
CHERRY_KEY = os.getenv("CHERRY_KEY")
API_KEY = os.getenv("API_KEY_PARTNER", "dev_underwriting_wizard_key")


async def parse_statements(ctx, deal_id: str):
    """Parse bank statements and recompute metrics for a deal."""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            headers = {"Authorization": f"Bearer {API_KEY}"}
            response = await client.post(
                f"{API_BASE}/api/deals/{deal_id}/metrics/recompute",
                headers=headers
            )
            response.raise_for_status()
            return {"ok": True, "deal_id": deal_id, "result": response.json()}
    except Exception as e:
        return {"ok": False, "deal_id": deal_id, "error": str(e)}


async def run_clear(ctx, deal_id: str, merchant_id: str):
    """Run comprehensive background checks (CLEAR, NYSCEF, SOS)."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            headers = {"Authorization": f"Bearer {API_KEY}"}
            
            # Call background check endpoint
            response = await client.post(
                f"{API_BASE}/api/background/check",
                json={
                    "merchant_id": merchant_id,
                    "person": {
                        "first_name": "John",  # Would get from deal/merchant data
                        "last_name": "Doe"
                    },
                    "business": {
                        "legal_name": "Business Name"  # Would get from merchant data
                    }
                },
                headers=headers
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Create background.result event
            event_data = {
                "tenant_id": None,
                "merchant_id": merchant_id,
                "deal_id": deal_id,
                "type": "background.result",
                "data": {
                    "status": result.get("result", {}).get("overall_decision", "REVIEW"),
                    "reasons": result.get("result", {}),
                    "job_id": result.get("job_id"),
                    "processed_by": "arq_worker"
                }
            }
            
            # Log the result as an event
            await client.post(
                f"{API_BASE}/api/events",
                json=event_data,
                headers=headers
            )
            
            return {"ok": True, "deal_id": deal_id, "result": result}
            
    except Exception as e:
        # Log error event
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                headers = {"Authorization": f"Bearer {API_KEY}"}
                await client.post(
                    f"{API_BASE}/api/events",
                    json={
                        "tenant_id": None,
                        "merchant_id": merchant_id,
                        "deal_id": deal_id,
                        "type": "background.error",
                        "data": {
                            "error": str(e),
                            "processed_by": "arq_worker"
                        }
                    },
                    headers=headers
                )
        except:
            pass  # Don't fail the job if logging fails
        
        return {"ok": False, "deal_id": deal_id, "error": str(e)}


async def send_sms_batch(ctx, messages: List[dict], campaign_name: str = "blast"):
    """Send batch SMS messages through Cherry SMS."""
    try:
        payload = {
            "campaignName": campaign_name,
            "messages": messages
        }
        
        async with httpx.AsyncClient(timeout=60) as client:
            headers = {
                "Authorization": f"Bearer {API_KEY}",
                "Idempotency-Key": campaign_name
            }
            
            response = await client.post(
                f"{API_BASE}/api/sms/cherry/send",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            return {"ok": True, "campaign": campaign_name, "result": response.json()}
            
    except Exception as e:
        return {"ok": False, "campaign": campaign_name, "error": str(e)}


async def generate_offers(ctx, deal_id: str, metrics: dict):
    """Generate funding offers based on computed metrics."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            headers = {"Authorization": f"Bearer {API_KEY}"}
            
            # Generate offers using the metrics
            payload = {
                "deal_id": deal_id,
                **metrics
            }
            
            response = await client.post(
                f"{API_BASE}/api/offers/",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            return {"ok": True, "deal_id": deal_id, "offers": response.json()}
            
    except Exception as e:
        return {"ok": False, "deal_id": deal_id, "error": str(e)}


async def heartbeat(ctx):
    """Worker heartbeat to ensure the system is running."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{API_BASE}/api/healthz")
            response.raise_for_status()
            return {"ok": True, "timestamp": response.json()}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# Worker configuration
class WorkerSettings:
    """Arq worker settings for Redis job processing."""
    
    redis_settings = RedisSettings(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        database=int(os.getenv("REDIS_DB", "0"))
    )
    
    # Available job functions
    functions = [
        parse_statements,
        run_clear,
        send_sms_batch,
        generate_offers,
        heartbeat
    ]
    
    # Cron jobs - run heartbeat every hour
    cron_jobs = [
        cron(heartbeat, minute=0)
    ]
    
    # Worker configuration
    max_jobs = 10
    job_timeout = 300  # 5 minutes
    keep_result = 3600  # Keep results for 1 hour