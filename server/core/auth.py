from typing import Set
from fastapi import Header, HTTPException
from core.config import get_settings

def _csv(s: str) -> Set[str]:
    return {x.strip() for x in (s or "").split(",") if x.strip()}

def require_bearer(authorization: str | None = Header(None, alias="Authorization")):
    s = get_settings()
    if s.AUTH_OPTIONAL:
        return
    tokens = _csv(s.AUTH_BEARER_TOKENS)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header required")
    token = authorization.split(" ", 1)[1]
    if tokens and token not in tokens:
        raise HTTPException(401, "Invalid bearer token")

def require_partner(x_partner_key: str | None = Header(None, alias="X-Partner-Key")):
    s = get_settings()
    if s.AUTH_OPTIONAL:
        return
    keys = _csv(s.PARTNER_KEYS)
    if not x_partner_key:
        raise HTTPException(401, "X-Partner-Key header required")
    if keys and x_partner_key not in keys:
        raise HTTPException(401, "Invalid partner key")