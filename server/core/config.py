from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "UW Wizard"
    DEBUG: bool = True
    PORT: int = 8000

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