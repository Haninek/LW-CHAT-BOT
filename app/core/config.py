"""Application configuration."""

import os
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Server settings
    PORT: int = Field(default=8081, description="Server port")
    DEBUG: bool = Field(default=False, description="Debug mode")
    
    # CORS settings
    CORS_ORIGIN: str = Field(default="https://app.lendwizely.com", description="CORS origin")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Get CORS origins as a list."""
        if self.DEBUG:
            return ["http://localhost:3000", "http://localhost:8080", self.CORS_ORIGIN]
        return [self.CORS_ORIGIN]
    
    # API Keys and External Services
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")
    OPENAI_MODEL_PARSE: str = Field(default="gpt-4o-mini", description="OpenAI model for parsing")
    
    PLAID_CLIENT_ID: str = Field(default="", description="Plaid client ID")
    PLAID_SECRET: str = Field(default="", description="Plaid secret")
    PLAID_ENV: str = Field(default="sandbox", description="Plaid environment")
    
    CHERRY_API_KEY: str = Field(default="", description="Cherry API key")
    DOCUSIGN_TOKEN: str = Field(default="", description="DocuSign token")
    DROPBOX_SIGN_API_KEY: str = Field(default="", description="Dropbox Sign API key")
    
    # Webhooks
    LENDWIZELY_WEBHOOK_URL: str = Field(
        default="https://app.lendwizely.com/api/bot-events",
        description="LendWizely webhook URL"
    )


# Global settings instance
settings = Settings()