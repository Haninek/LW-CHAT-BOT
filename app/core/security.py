"""Security utilities."""

import secrets
from typing import Optional

from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings


class APIKeyAuth(HTTPBearer):
    """API key authentication."""
    
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
    
    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        """Validate API key."""
        credentials = await super().__call__(request)
        
        if not credentials or not credentials.credentials:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
        
        # TODO: Implement proper API key validation
        # For now, just check if it's not empty
        if not credentials.credentials:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
        
        return credentials


def generate_api_key() -> str:
    """Generate a secure API key."""
    return secrets.token_urlsafe(32)


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify webhook signature."""
    import hmac
    import hashlib
    
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


# Global auth instance
api_key_auth = APIKeyAuth()