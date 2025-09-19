"""Metrics snapshot model for calculated financial metrics."""

from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class MetricsSnapshot(Base):
    """Metrics snapshot for calculated financial metrics from bank statements or Plaid."""
    __tablename__ = "metrics_snapshots"
    
    id = Column(String, primary_key=True, index=True)
    deal_id = Column(String, ForeignKey("deals.id"), nullable=False, index=True)
    source = Column(String, nullable=False)  # bank_statements, plaid, manual
    months_analyzed = Column(Integer)  # Number of months of data analyzed
    
    # Core metrics for underwriting
    avg_monthly_revenue = Column(Float)
    avg_daily_balance_3m = Column(Float)
    total_nsf_3m = Column(Integer)
    total_days_negative_3m = Column(Integer)
    
    # Additional metrics
    highest_balance = Column(Float)
    lowest_balance = Column(Float)
    total_deposits = Column(Float)
    total_withdrawals = Column(Float)
    deposit_frequency = Column(Float)
    
    # Quality indicators
    analysis_confidence = Column(Float, default=0.0)  # 0.0 to 1.0
    flags_json = Column(Text)  # JSON array of warning flags
    raw_metrics_json = Column(Text)  # Full metrics data
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    deal = relationship("Deal", back_populates="metrics_snapshots")