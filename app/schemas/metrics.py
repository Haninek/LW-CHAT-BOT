"""Metrics schemas for bank statement analysis."""

from typing import List, Optional

from pydantic import BaseModel, Field


class MonthlyMetrics(BaseModel):
    """Monthly metrics from bank statement."""
    
    statement_month: str = Field(..., description="Statement month in YYYY-MM format")
    total_deposits: float = Field(..., ge=0, description="Total deposits for the month")
    avg_daily_balance: float = Field(..., description="Average daily balance")
    ending_balance: float = Field(..., description="Ending balance for the month")
    nsf_count: int = Field(..., ge=0, description="Number of NSF (insufficient funds) occurrences")
    days_negative: int = Field(..., ge=0, description="Number of days with negative balance")


class Metrics(BaseModel):
    """Complete metrics from bank statement analysis."""
    
    months: Optional[List[MonthlyMetrics]] = Field(
        None,
        description="Monthly breakdown of metrics",
        max_length=12,
    )
    avg_monthly_revenue: float = Field(..., ge=0, description="Average monthly revenue")
    avg_daily_balance_3m: float = Field(..., description="Average daily balance over 3 months")
    total_nsf_3m: int = Field(..., ge=0, description="Total NSF count over 3 months")
    total_days_negative_3m: int = Field(..., ge=0, description="Total days negative over 3 months")
    
    class Config:
        """Pydantic configuration."""
        json_schema_extra = {
            "example": {
                "months": [
                    {
                        "statement_month": "2024-01",
                        "total_deposits": 15000.0,
                        "avg_daily_balance": 8500.0,
                        "ending_balance": 9200.0,
                        "nsf_count": 0,
                        "days_negative": 0,
                    },
                    {
                        "statement_month": "2024-02",
                        "total_deposits": 14500.0,
                        "avg_daily_balance": 8200.0,
                        "ending_balance": 8800.0,
                        "nsf_count": 1,
                        "days_negative": 2,
                    },
                    {
                        "statement_month": "2024-03",
                        "total_deposits": 16000.0,
                        "avg_daily_balance": 9100.0,
                        "ending_balance": 9500.0,
                        "nsf_count": 0,
                        "days_negative": 0,
                    },
                ],
                "avg_monthly_revenue": 15166.67,
                "avg_daily_balance_3m": 8600.0,
                "total_nsf_3m": 1,
                "total_days_negative_3m": 2,
            }
        }