import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "UW Wizard"
    DEBUG: bool = os.getenv("RAILWAY_ENVIRONMENT_NAME", "") == ""  # False in production
    PORT: int = int(os.getenv("PORT", "8000"))

    # Railway provides DATABASE_URL for PostgreSQL, fallback to SQLite
    DATABASE_URL: str = "sqlite:///./uwizard.db"
    REDIS_URL: str = "memory://local"   # use real Redis in staging/prod

    CORS_ORIGINS: str = "*"             # dev-friendly; lock down in staging

    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET: str = "uwizard-private"

    DOCUSIGN_WEBHOOK_SECRET: str = ""
    DROPBOXSIGN_WEBHOOK_SECRET: str = ""
    CHERRY_API_KEY: str = ""

    # Legacy fields (for compatibility)
    ENCRYPTION_KEY: str = ""
    API_KEY_PARTNER: str = ""
    PLAID_ENV: str = "sandbox"
    DOCUSIGN_BASE_URL: str = "https://demo.docusign.net"

    MOCK_MODE: bool = True              # local disk storage fallback

    # --- add these ---
    AUTH_OPTIONAL: bool = True            # allow all in dev (set False in staging/prod)
    AUTH_BEARER_TOKENS: str = "dev"       # CSV list of allowed Bearer tokens in dev
    PARTNER_KEYS: str = "demo"            # CSV list of allowed X-Partner-Key values
    
    # Railway/Production detection
    RAILWAY_ENVIRONMENT_NAME: str = ""    # Railway sets this automatically
    # --- end add ---

    @property
    def is_production(self) -> bool:
        """Detect if running in production (Railway or similar)"""
        return bool(self.RAILWAY_ENVIRONMENT_NAME) or not self.DEBUG

    @property
    def cors_origins_list(self) -> List[str]:
        if self.DEBUG and self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()