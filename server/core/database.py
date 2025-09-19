"""Database configuration and initialization."""

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
import logging
from core.config import get_settings

logger = logging.getLogger(__name__)

def create_engine_with_fallback():
    """Create database engine with fallback to SQLite in development."""
    settings = get_settings()
    
    try:
        engine = create_engine(settings.DATABASE_URL, future=True)
        # Test the connection
        engine.connect().close()
        logger.info(f"✅ Connected to database: {settings.DATABASE_URL.split('://')[0]}://...")
        return engine
    except Exception as e:
        if settings.DEBUG and 'postgresql' in settings.DATABASE_URL.lower():
            logger.warning(f"PostgreSQL connection failed: {e}")
            logger.warning("Falling back to SQLite for development")
            fallback_url = "sqlite:///./uwizard.db"
            engine = create_engine(fallback_url, future=True)
            logger.info("✅ Connected to SQLite fallback database")
            return engine
        raise

# SQLite FK enforcement
@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Turn on FK checks for SQLite dev environment"""
    settings = get_settings()
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

engine = create_engine_with_fallback()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_dev_sqlite_if_needed(Base):
    settings = get_settings()
    if settings.DEBUG and settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()