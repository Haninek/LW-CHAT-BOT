"""Seed data service for development."""

import json
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.merchant import Merchant, FieldState
from models.event import Event


class SeedService:
    """Service to create seed data."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_initial_data(self):
        """Create initial seed data if not exists."""
        
        # Check if seed data already exists
        existing_merchant = self.db.query(Merchant).first()
        if existing_merchant:
            return
        
        # Create existing merchant with partial data
        existing_merchant = Merchant(
            id="merchant_1",
            legal_name="Maple Deli & Catering LLC",
            dba="Maple Deli",
            phone="555-0123",
            email="ava@mapledeli.com",
            address="123 Main Street",
            city="Portland", 
            state="OR",
            zip="97205",
            status="existing"
        )
        self.db.add(existing_merchant)
        
        # Add field states for existing merchant (missing owner info)
        field_states = [
            FieldState(
                merchant_id="merchant_1",
                field_id="business.legal_name",
                value="Maple Deli & Catering LLC",
                source="crm",
                last_verified_at=datetime.utcnow() - timedelta(days=30),
                confidence=0.95
            ),
            FieldState(
                merchant_id="merchant_1", 
                field_id="contact.phone",
                value="555-0123",
                source="crm",
                last_verified_at=datetime.utcnow() - timedelta(days=60),
                confidence=0.9
            ),
            FieldState(
                merchant_id="merchant_1",
                field_id="contact.email", 
                value="ava@mapledeli.com",
                source="crm",
                last_verified_at=datetime.utcnow() - timedelta(days=45),
                confidence=0.95
            ),
            # Missing: owner.dob, owner.ssn_last4 (will be asked by chatbot)
        ]
        
        for fs in field_states:
            self.db.add(fs)
        
        # Create new merchant (blank slate)
        new_merchant = Merchant(
            id="merchant_2",
            legal_name="New Business Co",
            status="new"
        )
        self.db.add(new_merchant)
        
        # Create welcome events
        events = [
            Event(
                type="merchant.created",
                merchant_id="merchant_1", 
                data_json=json.dumps({"source": "seed_data", "type": "existing"})
            ),
            Event(
                type="merchant.created",
                merchant_id="merchant_2",
                data_json=json.dumps({"source": "seed_data", "type": "new"})
            )
        ]
        
        for event in events:
            self.db.add(event)
        
        self.db.commit()
        print("✅ Seed data created successfully")