import hashlib, json, asyncio
from typing import Optional, Tuple
from fastapi import Header, HTTPException, Request, Depends
from redis.asyncio import from_url as redis_from_url
from .config import get_settings

_settings = get_settings()
_redis = redis_from_url(_settings.REDIS_URL, encoding="utf-8", decode_responses=True)
_TTL = 60 * 60  # 1h

async def capture_body(request: Request):
    if not hasattr(request.state, "_body_cache"):
        request.state._body_cache = await request.body()

def _make_key(tenant_id: str, path: str, idem: str, body: bytes) -> str:
    h = hashlib.sha256(body or b"").hexdigest()
    return f"idem:{tenant_id}:{path}:{idem}:{h}"

async def require_idempotency(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
):
    if not idempotency_key:
        raise HTTPException(400, detail="Missing Idempotency-Key")
    if not tenant_id:
        raise HTTPException(400, detail="Missing X-Tenant-ID")
    key = _make_key(tenant_id, request.url.path, idempotency_key, request.state._body_cache or b"")
    cached = await _redis.get(key)
    if cached:
        # short-circuit: route can check request.state.idem_cached
        request.state.idem_cached = json.loads(cached)
    request.state.idem_key = key
    return (tenant_id, key)

async def store_idempotent(request: Request, payload: dict):
    key = getattr(request.state, "idem_key", None)
    if not key: return
    await _redis.set(key, json.dumps(payload), ex=_TTL)