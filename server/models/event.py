"""Event model for activity tracking."""

from sqlalchemy import Column, String, DateTime, Text, Index, func
from .base import Base

class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, index=True, nullable=True)
    merchant_id = Column(String, nullable=True)
    deal_id = Column(String, index=True, nullable=True)
    type = Column(String, nullable=False)
    data_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

Index("ix_events_type_created", Event.type, Event.created_at.desc())