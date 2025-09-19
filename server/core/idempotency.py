import hashlib, json, time
from typing import Optional
from fastapi import Header, HTTPException, Request
from core.config import get_settings

S = get_settings()
_memory_store = {}

try:
    from redis.asyncio import from_url as redis_from_url
    R = None if S.REDIS_URL.startswith("memory://") else redis_from_url(S.REDIS_URL, encoding="utf-8", decode_responses=True)
except Exception:
    R = None

TTL = 3600

async def capture_body(request: Request):
    request.state._body_cache = await request.body()

def _key(tenant_id: str, path: str, idem: str, body: bytes) -> str:
    h = hashlib.sha256(body or b"").hexdigest()
    return f"idem:{tenant_id}:{path}:{idem}:{h}"

async def require_idempotency(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
):
    if not idempotency_key: raise HTTPException(400, "Missing Idempotency-Key")
    if not tenant_id: raise HTTPException(400, "Missing X-Tenant-ID")
    request.state.tenant_id = tenant_id
    key = _key(tenant_id, request.url.path, idempotency_key, getattr(request.state, "_body_cache", b""))

    if R:
        cached = await R.get(key)
        if cached: request.state.idem_cached = json.loads(cached)
        request.state.idem_key = key
    else:
        # in-memory fallback for Replit dev
        row = _memory_store.get(key)
        if row and (time.time() - row["ts"] < TTL):
            request.state.idem_cached = row["val"]
        request.state.idem_key = key

    return tenant_id

async def store_idempotent(request: Request, payload: dict):
    key = getattr(request.state, "idem_key", None)
    if not key: return
    if R: await R.set(key, json.dumps(payload), ex=TTL)
    else: _memory_store[key] = {"val": payload, "ts": time.time()}