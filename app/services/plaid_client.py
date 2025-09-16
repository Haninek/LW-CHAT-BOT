"""Plaid client service."""

import logging
from datetime import datetime
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.errors import APIException

logger = logging.getLogger(__name__)


class PlaidClient:
    """Plaid API client."""
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        secret: Optional[str] = None,
        environment: Optional[str] = None,
    ):
        self.client_id = client_id or settings.PLAID_CLIENT_ID
        self.secret = secret or settings.PLAID_SECRET
        self.environment = environment or settings.PLAID_ENV
        
        # Set base URL based on environment
        env_urls = {
            "sandbox": "https://sandbox.plaid.com",
            "development": "https://development.plaid.com",
            "production": "https://production.plaid.com",
        }
        self.base_url = env_urls.get(self.environment, env_urls["sandbox"])
        
        if not self.client_id or not self.secret:
            logger.warning("Plaid credentials not configured")
    
    async def create_link_token(self, user_id: str) -> Dict[str, str]:
        """
        Create a Link token for Plaid Link initialization.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            Dictionary containing link_token and expiration
            
        Raises:
            APIException: If token creation fails
        """
        if not self.client_id or not self.secret:
            raise APIException("Plaid credentials not configured", status_code=500)
        
        data = {
            "client_id": self.client_id,
            "secret": self.secret,
            "client_name": "LendWizely Chat Bot",
            "country_codes": ["US"],
            "language": "en",
            "user": {"client_user_id": user_id},
            "products": ["transactions"],
        }
        
        try:
            response = await self._make_request("/link/token/create", data)
            return {
                "link_token": response["link_token"],
                "expiration": response["expiration"],
            }
        except Exception as e:
            logger.error(f"Failed to create link token: {str(e)}")
            raise APIException("Failed to create Plaid link token", status_code=502)
    
    async def exchange_public_token(self, public_token: str) -> Dict[str, str]:
        """
        Exchange a public token for an access token.
        
        Args:
            public_token: Public token from Plaid Link
            
        Returns:
            Dictionary containing access_token and item_id
            
        Raises:
            APIException: If token exchange fails
        """
        if not self.client_id or not self.secret:
            raise APIException("Plaid credentials not configured", status_code=500)
        
        data = {
            "client_id": self.client_id,
            "secret": self.secret,
            "public_token": public_token,
        }
        
        try:
            response = await self._make_request("/link/token/exchange", data)
            return {
                "access_token": response["access_token"],
                "item_id": response["item_id"],
            }
        except Exception as e:
            logger.error(f"Failed to exchange public token: {str(e)}")
            raise APIException("Failed to exchange Plaid public token", status_code=502)
    
    async def get_transactions(
        self,
        access_token: str,
        start_date: str,
        end_date: str,
    ) -> List[Dict]:
        """
        Get transactions for a given date range.
        
        Args:
            access_token: Plaid access token
            start_date: Start date in ISO format (YYYY-MM-DD)
            end_date: End date in ISO format (YYYY-MM-DD)
            
        Returns:
            List of transaction dictionaries
            
        Raises:
            APIException: If transaction retrieval fails
        """
        if not self.client_id or not self.secret:
            raise APIException("Plaid credentials not configured", status_code=500)
        
        data = {
            "client_id": self.client_id,
            "secret": self.secret,
            "access_token": access_token,
            "start_date": start_date,
            "end_date": end_date,
        }
        
        try:
            response = await self._make_request("/transactions/get", data)
            return response["transactions"]
        except Exception as e:
            logger.error(f"Failed to get transactions: {str(e)}")
            raise APIException("Failed to retrieve Plaid transactions", status_code=502)
    
    async def _make_request(self, endpoint: str, data: Dict) -> Dict:
        """Make HTTP request to Plaid API."""
        headers = {
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    json=data,
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Plaid API error: {e.response.status_code} - {e.response.text}")
                raise APIException(f"Plaid API error: {e.response.status_code}", status_code=502)
            except httpx.RequestError as e:
                logger.error(f"Plaid request error: {str(e)}")
                raise APIException("Failed to connect to Plaid API", status_code=502)


# Global client instance
plaid_client = PlaidClient()