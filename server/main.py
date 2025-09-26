"""
Underwriting Wizard - FastAPI Backend
Multi-tenant automated underwriting and CRM integration platform
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from core.config import get_settings
from core.database import init_dev_sqlite_if_needed
from models.base import Base
from core.middleware import setup_middleware
# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import health endpoint first (critical for Railway)
from routes import health

# Try to import other routes, but continue if they fail
optional_routes = []
route_modules = [
    'connectors', 'merchants', 'deals', 'documents', 'underwriting', 
    'intake', 'ingest', 'bank', 'plaid', 'offers', 'background', 
    'sign', 'events', 'admin', 'queue', 'sms', 'statements', 
    'analysis', 'chat', 'deals_read', 'deals_actions'
]

for module_name in route_modules:
    try:
        module = __import__(f'routes.{module_name}', fromlist=[module_name])
        optional_routes.append((module_name, module))
        logger.info(f"✅ Loaded route module: {module_name}")
    except Exception as e:
        logger.error(f"⚠️ Failed to load route module {module_name}: {e}")
        logger.error(f"Import error details: {type(e).__name__}: {str(e)}")
        logger.info(f"Continuing without {module_name} routes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Starting Underwriting Wizard backend...")
    
    try:
        settings = get_settings()
        
        # Only initialize database in development or if specifically needed
        if settings.DEBUG or not settings.is_production:
            # Initialize database for development
            init_dev_sqlite_if_needed(Base)
            
            # Ensure tables are created when falling back to SQLite from Postgres
            from core.database import get_engine
            engine = get_engine()
            if engine.dialect.name == 'sqlite':
                logger.info("Creating SQLite tables after fallback...")
                Base.metadata.create_all(bind=engine)
        else:
            logger.info("Production mode: skipping database table creation")
        
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
    
    # Create app with optional lifespan for Railway compatibility
    lifespan_handler = lifespan if not os.getenv("RAILWAY_MINIMAL_START") else None
    
    app = FastAPI(
        title="Underwriting Wizard API",
        description="Multi-tenant automated underwriting and CRM integration platform",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan_handler
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

    # Include API routes - always include health first
    app.include_router(health.router, prefix="/api", tags=["health"])
    
    # Add root health endpoint for Railway
    @app.get("/health")
    async def root_health():
        """Root health check for Railway"""
        return {"status": "OK", "service": "UW Wizard"}
    
    # Include other routes dynamically
    route_configs = {
        'connectors': {'prefix': '/api/connectors', 'tags': ['connectors']},
        'merchants': {'prefix': '/api/merchants', 'tags': ['merchants']},
        'deals': {'prefix': '/api', 'tags': ['deals']},
        'documents': {'tags': ['documents']},
        'underwriting': {'prefix': '/api', 'tags': ['underwriting']},
        'intake': {'prefix': '/api/intake', 'tags': ['intake']},
        'ingest': {'prefix': '/api/ingest', 'tags': ['ingest']},
        'bank': {'prefix': '/api/bank', 'tags': ['documents']},
        'plaid': {'prefix': '/api/plaid', 'tags': ['plaid']},
        'offers': {'prefix': '/api/offers', 'tags': ['offers']},
        'background': {'prefix': '/api/background', 'tags': ['background']},
        'sign': {'prefix': '/api/sign', 'tags': ['contracts']},
        'events': {'prefix': '/api/events', 'tags': ['events']},
        'admin': {'prefix': '/api/admin', 'tags': ['admin']},
        'queue': {'prefix': '/api/queue', 'tags': ['queue']},
        'sms': {'prefix': '/api'},
        'statements': {},
        'analysis': {},  # Already has prefix="/api/analysis" in router definition
        'deals_read': {'prefix': '/api/public/deals', 'tags': ['deals.public']},
        'deals_actions': {'prefix': '/api/deals', 'tags': ['deals.actions']}
    }
    
    loaded_routes = 0
    for module_name, module in optional_routes:
        try:
            if hasattr(module, 'router'):
                config = route_configs.get(module_name, {})
                app.include_router(module.router, **config)
                loaded_routes += 1
                logger.info(f"✅ Included router: {module_name}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to include router {module_name}: {e}")
    
    logger.info(f"✅ {loaded_routes} API routes loaded successfully")
    
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
            "env_port": os.getenv("PORT", "not set"),
            "loaded_routes": loaded_routes,
            "loaded_route_modules": [name for name, _ in optional_routes],
            "total_route_modules_attempted": len(route_modules)
        }

    # Serve static files for production with SPA routing support
    static_dir = None
    if os.path.exists("static"):
        static_dir = "static"  # Railway build puts frontend here
    elif os.path.exists("../web/dist"):
        static_dir = "../web/dist"  # Local development
    
    # Serve static files if directory exists (Railway deployment) or in production
    if static_dir:
        logger.info(f"📁 Serving static files from: {static_dir}")
        
        # First, mount static assets (CSS, JS, etc.)
        app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets") if os.path.exists(os.path.join(static_dir, "assets")) else static_dir), name="assets")
        
        # Add SPA routing for specific known frontend routes only
        from fastapi.responses import FileResponse
        frontend_routes = [
            "/", "/dashboard", "/settings", "/chat", "/campaigns", 
            "/merchants", "/deals", "/connectors", "/offers", 
            "/background", "/sign"
        ]
        
        for route in frontend_routes:
            # Create a closure to capture the route value
            def make_spa_handler(route_path: str):
                async def spa_handler():
                    index_path = os.path.join(static_dir, "index.html")
                    if os.path.isfile(index_path):
                        return FileResponse(index_path)
                    raise HTTPException(status_code=404, detail="Frontend not found")
                return spa_handler
            
            app.get(route)(make_spa_handler(route))
        
        # Handle other static files with a catch-all for file extensions
        @app.get("/{file_path:path}")
        async def serve_static_files(file_path: str):
            """Serve static files like favicon.ico, manifest.json, etc."""
            # NEVER interfere with API routes
            if file_path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not found")
            
            # Only serve files with extensions or known static files
            if "." in file_path or file_path in ["favicon.ico", "manifest.json", "robots.txt"]:
                full_path = os.path.join(static_dir, file_path)
                if os.path.isfile(full_path):
                    return FileResponse(full_path)
            
            # For unknown routes without extensions that aren't API routes, serve SPA
            index_path = os.path.join(static_dir, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path)
            
            raise HTTPException(status_code=404, detail="Not found")
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
    
    # Log startup information
    logger.info(f"🚀 Starting server on 0.0.0.0:{settings.PORT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Production mode: {settings.is_production}")
    logger.info(f"Railway environment: {settings.RAILWAY_ENVIRONMENT_NAME}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
