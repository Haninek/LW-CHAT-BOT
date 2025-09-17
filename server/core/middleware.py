"""Custom middleware setup."""

import json
import time
from typing import Callable
from fastapi import FastAPI, Request, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Request/response logging with secret redaction."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(f"📝 {request.method} {request.url.path}")
        
        response = await call_next(request)
        
        # Log response time
        process_time = time.time() - start_time
        logger.info(f"⏱️  {request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting."""
    
    def __init__(self, app, calls_per_minute: int = 60):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.requests = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host
        current_time = time.time()
        
        # Clean old entries
        self.requests = {
            ip: times for ip, times in self.requests.items()
            if any(t > current_time - 60 for t in times)
        }
        
        # Check rate limit
        if client_ip in self.requests:
            recent_requests = [t for t in self.requests[client_ip] if t > current_time - 60]
            if len(recent_requests) >= self.calls_per_minute:
                return Response(
                    content=json.dumps({"error": "Rate limit exceeded"}),
                    status_code=429,
                    media_type="application/json"
                )
            self.requests[client_ip] = recent_requests + [current_time]
        else:
            self.requests[client_ip] = [current_time]
        
        return await call_next(request)


def setup_middleware(app: FastAPI):
    """Setup all middleware."""
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, calls_per_minute=100)