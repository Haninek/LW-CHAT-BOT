"""
Underwriting Wizard - FastAPI Backend
Multi-tenant automated underwriting and CRM integration platform
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from core.config import get_settings
from core.database import init_db
from core.middleware import setup_middleware
from routes import (
    health,
    connectors, 
    merchants,
    deals,
    documents,
    underwriting,
    intake,
    ingest,
    bank,
    plaid,
    offers,
    background,
    sign,
    events,
    admin,
    queue,
    sms
)

# Import deals extensions separately  
from routes import deals_read, deals_actions

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Starting Underwriting Wizard backend...")
    
    # Initialize database
    await init_db()
    
    # Create data directories
    os.makedirs("data/contracts", exist_ok=True)
    os.makedirs("data/uploads", exist_ok=True)
    
    logger.info("✅ Backend initialized successfully")
    yield
    
    logger.info("🛑 Shutting down backend...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    # Get settings first
    settings = get_settings()
    
    app = FastAPI(
        title="Underwriting Wizard API",
        description="Multi-tenant automated underwriting and CRM integration platform",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan
    )

    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"]
    )

    # Setup custom middleware
    setup_middleware(app)

    # Include API routes
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(connectors.router, prefix="/api/connectors", tags=["connectors"])
    app.include_router(merchants.router, prefix="/api/merchants", tags=["merchants"])
    app.include_router(deals.router, prefix="/api", tags=["deals"])
    app.include_router(documents.router, prefix="/api", tags=["documents"])
    app.include_router(underwriting.router, prefix="/api", tags=["underwriting"])
    app.include_router(intake.router, prefix="/api/intake", tags=["intake"])
    app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
    app.include_router(bank.router, prefix="/api/bank", tags=["documents"])
    app.include_router(plaid.router, prefix="/api/plaid", tags=["plaid"])
    app.include_router(offers.router, prefix="/api/offers", tags=["offers"])
    app.include_router(background.router, prefix="/api/background", tags=["background"])
    app.include_router(sign.router, prefix="/api/sign", tags=["contracts"])
    app.include_router(events.router, prefix="/api/events", tags=["events"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    app.include_router(queue.router, prefix="/api/queue", tags=["queue"])
    app.include_router(sms.router, prefix="/api")
    # Public deals endpoints for frontend (read-only, limited data)
    app.include_router(deals_read.router, prefix="/api/public/deals", tags=["deals.public"])
    app.include_router(deals_actions.router, prefix="/api/deals", tags=["deals.actions"])

    # Serve static files for production
    if not settings.DEBUG and os.path.exists("../web/dist"):
        app.mount("/", StaticFiles(directory="../web/dist", html=True), name="static")

    return app


app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )