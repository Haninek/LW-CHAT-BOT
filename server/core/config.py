"""Configuration management."""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database
    DATABASE_URL: str = "sqlite:///./data.db"
    
    # Security (must be provided via environment)
    ENCRYPTION_KEY: str
    API_KEY_PARTNER: str
    
    # Application
    DEBUG: bool = True
    PORT: int = 8000
    MOCK_MODE: bool = True
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5000,http://127.0.0.1:5000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # External APIs
    OPENAI_API_KEY: str = ""
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"
    CLEAR_API_KEY: str = ""
    DOCUSIGN_ACCESS_TOKEN: str = ""
    DOCUSIGN_ACCOUNT_ID: str = ""
    DOCUSIGN_BASE_URL: str = "https://demo.docusign.net"
    DROPBOX_SIGN_API_KEY: str = ""
    CHERRY_SMS_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()