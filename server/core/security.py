"""Security utilities."""

from cryptography.fernet import Fernet
from fastapi import HTTPException, Depends, Header
from typing import Optional
import base64
import json

from core.config import get_settings

settings = get_settings()


def get_encryption_key() -> bytes:
    """Get encryption key for secrets."""
    import base64
    try:
        # Assume ENCRYPTION_KEY is a valid base64-encoded 32-byte key
        return base64.urlsafe_b64decode(settings.ENCRYPTION_KEY.encode())
    except Exception:
        raise ValueError("Invalid ENCRYPTION_KEY - must be a valid base64-encoded 32-byte Fernet key")


def encrypt_data(data: dict) -> str:
    """Encrypt configuration data."""
    fernet = Fernet(get_encryption_key())
    json_data = json.dumps(data)
    encrypted = fernet.encrypt(json_data.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_data(encrypted_data: str) -> dict:
    """Decrypt configuration data."""
    try:
        fernet = Fernet(get_encryption_key())
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = fernet.decrypt(encrypted_bytes)
        return json.loads(decrypted.decode())
    except Exception as e:
        # Log the error for debugging but don't expose secrets
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to decrypt configuration data: {str(e)}")
        raise ValueError("Failed to decrypt configuration data")


def mask_secrets(config: dict) -> dict:
    """Mask sensitive values in configuration."""
    masked = {}
    for key, value in config.items():
        if any(secret in key.lower() for secret in ['key', 'secret', 'token', 'password']):
            if isinstance(value, str) and len(value) > 8:
                masked[key] = f"{value[:4]}...{value[-4:]}"
            else:
                masked[key] = "***"
        else:
            masked[key] = value
    return masked


async def verify_partner_key(authorization: Optional[str] = Header(None)) -> bool:
    """Verify partner API key."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    if token != settings.API_KEY_PARTNER:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True