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
from core.database import init_dev_sqlite_if_needed
from models.base import Base
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
    sms,
    statements,
    analysis
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
    
    try:
        # Initialize database for development
        init_dev_sqlite_if_needed(Base)
        
        # Ensure tables are created when falling back to SQLite from Postgres
        from core.database import create_engine_with_fallback
        engine = create_engine_with_fallback()
        if engine.dialect.name == 'sqlite':
            logger.info("Creating SQLite tables after fallback...")
            Base.metadata.create_all(bind=engine)
        
        # Create data directories
        os.makedirs("data/contracts", exist_ok=True)
        os.makedirs("data/uploads", exist_ok=True)
        
        logger.info("✅ Backend initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️ Database initialization warning: {e}")
        logger.info("Continuing startup without database...")
    
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

    # More permissive hosts for Railway deployment
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Allow all hosts for Railway health checks
    )

    # Setup custom middleware
    setup_middleware(app)

    # Include API routes
    app.include_router(health.router, prefix="/api", tags=["health"])
    
    # Add root health endpoint for Railway
    @app.get("/health")
    async def root_health():
        """Root health check for Railway"""
        return {"status": "OK", "service": "UW Wizard"}
    app.include_router(connectors.router, prefix="/api/connectors", tags=["connectors"])
    app.include_router(merchants.router, prefix="/api/merchants", tags=["merchants"])
    app.include_router(deals.router, prefix="/api", tags=["deals"])
    app.include_router(documents.router, tags=["documents"])
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
    app.include_router(statements.router)
    app.include_router(analysis.router)
    # Public deals endpoints for frontend (read-only, limited data)
    app.include_router(deals_read.router, prefix="/api/public/deals", tags=["deals.public"])
    app.include_router(deals_actions.router, prefix="/api/deals", tags=["deals.actions"])
    
    # Add a debug route to check configuration
    @app.get("/debug")
    async def debug_info():
        import os
        return {
            "static_dir_exists": os.path.exists("static"),
            "static_files": os.listdir("static") if os.path.exists("static") else [],
            "web_dist_exists": os.path.exists("../web/dist"),
            "debug_mode": settings.DEBUG,
            "is_production": settings.is_production,
            "railway_env": settings.RAILWAY_ENVIRONMENT_NAME,
            "port": settings.PORT,
            "current_dir": os.getcwd(),
            "env_port": os.getenv("PORT", "not set")
        }

    # Serve static files for production
    static_dir = None
    if os.path.exists("static"):
        static_dir = "static"  # Railway build puts frontend here
    elif os.path.exists("../web/dist"):
        static_dir = "../web/dist"  # Local development
    
    # Serve static files if directory exists (Railway deployment) or in production
    if static_dir:
        logger.info(f"📁 Serving static files from: {static_dir}")
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    else:
        logger.info(f"⚠️ No static directory found - frontend will not be served")
        
        # Add a simple fallback route only when no static files exist
        @app.get("/")
        async def root_fallback():
            return {
                "app": "UW Wizard", 
                "status": "API Running",
                "message": "Frontend not available - static files not found",
                "debug": "/debug",
                "api_docs": "/docs",
                "health": "/api/healthz"
            }

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
