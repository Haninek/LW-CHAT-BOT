"""Connector model for external service integrations."""

from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime

from core.database import Base


class Connector(Base):
    """External service connector configurations (encrypted)."""
    __tablename__ = "connectors"
    
    name = Column(String, primary_key=True, unique=True)  # docusign, plaid, clear, cherry_sms, dropbox_sign
    encrypted_config = Column(Text, nullable=False)  # Fernet encrypted JSON
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)