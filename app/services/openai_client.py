"""OpenAI client service."""

import asyncio
import logging
from typing import List, Optional

import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.core.errors import APIException

logger = logging.getLogger(__name__)


class OpenAIClient:
    """OpenAI API client."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1"
        self.model = settings.OPENAI_MODEL_PARSE
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured")
    
    async def analyze_statements(self, files: List[bytes]) -> dict:
        """
        Analyze bank statements using OpenAI.
        
        Args:
            files: List of PDF file contents as bytes
            
        Returns:
            Parsed metrics dictionary
            
        Raises:
            APIException: If analysis fails
        """
        if not self.api_key:
            raise APIException("OpenAI API key not configured", status_code=500)
        
        if len(files) != 3:
            raise APIException("Exactly 3 PDF files required", status_code=422)
        
        # TODO: Implement actual OpenAI API call with structured outputs
        # For now, return mock data
        logger.info(f"Analyzing {len(files)} bank statements")
        
        # Simulate processing time
        await asyncio.sleep(0.1)
        
        # Mock response - replace with actual OpenAI API call
        return {
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
    
    async def _make_request(self, endpoint: str, data: dict) -> dict:
        """Make HTTP request to OpenAI API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/{endpoint}",
                    json=data,
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"OpenAI API error: {e.response.status_code} - {e.response.text}")
                raise APIException(f"OpenAI API error: {e.response.status_code}", status_code=502)
            except httpx.RequestError as e:
                logger.error(f"OpenAI request error: {str(e)}")
                raise APIException("Failed to connect to OpenAI API", status_code=502)


# Global client instance
openai_client = OpenAIClient()