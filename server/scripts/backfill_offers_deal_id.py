"""Backfill script to map existing offers to deals using heuristics."""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
import uuid

# Add the server directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def cuid():
    """Generate a simple UUID for new deals."""
    return str(uuid.uuid4())

def backfill_offers_to_deals():
    """Backfill existing offers with deal_id values."""
    
    # Use the same database path as the main app
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data.db')
    engine = create_engine(f'sqlite:///{db_path}')
    
    SQL = {
        "find_unlinked": """
            SELECT o.id AS offer_id, o.merchant_id, o.created_at
            FROM offers o
            WHERE (o.deal_id IS NULL OR o.deal_id = '')
        """,
        "find_deal_by_time": """
            SELECT d.id
            FROM deals d
            WHERE d.merchant_id = :mid
              AND d.created_at <= :o_created
            ORDER BY d.created_at DESC
            LIMIT 1
        """,
        "find_latest_deal": """
            SELECT d.id
            FROM deals d
            WHERE d.merchant_id = :mid
            ORDER BY d.created_at DESC
            LIMIT 1
        """,
        "create_deal": """
            INSERT INTO deals (id, merchant_id, status, created_at)
            VALUES (:id, :mid, 'open', :created_at)
        """,
        "attach": """
            UPDATE offers SET deal_id = :did WHERE id = :oid
        """
    }
    
    with engine.begin() as conn:
        # Find all offers without deal_id
        rows = conn.execute(text(SQL["find_unlinked"])).mappings().all()
        print(f"📋 Found {len(rows)} offers to backfill")
        
        if not rows:
            print("✅ No offers need backfilling")
            return
        
        for r in rows:
            mid = r["merchant_id"]
            o_created = r["created_at"] or datetime.utcnow()
            
            # Convert string datetime to proper format if needed
            if isinstance(o_created, str):
                try:
                    o_created = datetime.fromisoformat(o_created.replace('Z', '+00:00'))
                except:
                    o_created = datetime.utcnow()
            
            did = None
            
            # Try to find a deal created on/before the offer date
            row = conn.execute(text(SQL["find_deal_by_time"]), {
                "mid": mid, 
                "o_created": o_created.isoformat()
            }).first()
            
            if row:
                did = row[0]
                print(f"📎 Found existing deal {did} for offer {r['offer_id']}")
            else:
                # Try to find the latest deal for this merchant
                row = conn.execute(text(SQL["find_latest_deal"]), {"mid": mid}).first()
                if row:
                    did = row[0]
                    print(f"📎 Using latest deal {did} for offer {r['offer_id']}")
            
            # If no deal exists, create a new one
            if not did:
                did = cuid()
                conn.execute(text(SQL["create_deal"]), {
                    "id": did, 
                    "mid": mid,
                    "created_at": o_created.isoformat()
                })
                print(f"🆕 Created new deal {did} for offer {r['offer_id']}")
            
            # Attach the offer to the deal
            conn.execute(text(SQL["attach"]), {"did": did, "oid": r["offer_id"]})
            print(f"✅ Offer {r['offer_id']} -> Deal {did}")
    
    print("🎉 Backfill completed successfully!")

if __name__ == "__main__":
    backfill_offers_to_deals()