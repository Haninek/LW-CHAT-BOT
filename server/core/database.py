"""Database configuration and initialization."""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import asyncio
import os

from core.config import settings

# Force SQLite for this application (per brief requirements)
database_url = "sqlite:///./data.db"

# SQLite configuration for development
engine = create_engine(
    database_url,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def init_db():
    """Initialize database tables."""
    # Import models to register them
    from models import merchant, connector, intake, offer, background_job, agreement, event, tenant
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Run seed data
    await seed_data()


async def seed_data():
    """Create seed data for development."""
    from services.seed_service import SeedService
    
    db = SessionLocal()
    try:
        seed_service = SeedService(db)
        await seed_service.create_initial_data()
    finally:
        db.close()