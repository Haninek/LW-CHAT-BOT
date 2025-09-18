#!/usr/bin/env python3
"""
Pipedrive ETL Script - Import Organizations, Persons, Deals, and Files
Syncs data from Pipedrive CRM into Underwriting Wizard database
"""

import os
import asyncio
import httpx
import time
import sys
from datetime import datetime
from dateutil.parser import isoparse
from sqlalchemy import create_engine, text

# Configuration
PIPEDRIVE_API_TOKEN = os.getenv("PIPEDRIVE_API_TOKEN")
PIPEDRIVE_BASE = "https://api.pipedrive.com/v1"
DB_URL = os.getenv("DATABASE_URL", "sqlite:///data/uwizard.db")
TENANT_ID = os.getenv("TENANT_ID", "T1")
API_BASE = os.getenv("API_BASE", "http://localhost:8000")
API_KEY = os.getenv("API_KEY_PARTNER", "dev_underwriting_wizard_key")

# Rate limiting
REQUEST_DELAY = 0.2  # 200ms between requests


def log(message: str):
    """Log with timestamp."""
    print(f"[{datetime.now().isoformat()}] {message}")


async def fetch_all_paginated(client: httpx.AsyncClient, path: str, params: dict = None):
    """Fetch all pages from a Pipedrive API endpoint."""
    if params is None:
        params = {}
    
    params["api_token"] = PIPEDRIVE_API_TOKEN
    params["limit"] = 500  # Max page size
    
    start = 0
    results = []
    
    while True:
        params["start"] = start
        
        try:
            response = await client.get(f"{PIPEDRIVE_BASE}/{path}", params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                log(f"API error for {path}: {data.get('error', 'Unknown error')}")
                break
            
            items = data.get("data") or []
            results.extend(items)
            
            log(f"Fetched {len(items)} items from {path} (total: {len(results)})")
            
            # Check if there are more pages
            pagination = data.get("additional_data", {}).get("pagination", {})
            if not pagination.get("more_items_in_collection"):
                break
            
            start = pagination.get("next_start")
            if start is None:
                break
            
            # Rate limiting
            await asyncio.sleep(REQUEST_DELAY)
            
        except Exception as e:
            log(f"Error fetching {path}: {str(e)}")
            break
    
    return results


def create_database_engine():
    """Create and test database connection."""
    try:
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        log(f"Connected to database: {DB_URL}")
        return engine
    except Exception as e:
        log(f"Database connection failed: {str(e)}")
        sys.exit(1)


def upsert_merchant(conn, org: dict):
    """Insert or update merchant from Pipedrive organization."""
    try:
        # Extract fields from Pipedrive org
        legal_name = org.get("name") or "Unknown Business"
        
        # Handle phone - could be list or single value
        phone = None
        phone_data = org.get("phone")
        if isinstance(phone_data, list) and phone_data:
            phone = phone_data[0].get("value")
        elif isinstance(phone_data, str):
            phone = phone_data
        
        # Handle email - could be list or single value  
        email = None
        email_data = org.get("email")
        if isinstance(email_data, list) and email_data:
            email = email_data[0].get("value")
        elif isinstance(email_data, str):
            email = email_data
        
        external_id = str(org.get("id"))
        merchant_id = f"pipedrive_org_{external_id}"
        
        # Address fields
        address = org.get("address")
        
        conn.execute(text("""
            INSERT OR REPLACE INTO merchants 
            (id, tenant_id, external_id, legal_name, phone, email, address, status, created_at, updated_at)
            VALUES (:id, :tenant_id, :external_id, :legal_name, :phone, :email, :address, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": merchant_id,
            "tenant_id": TENANT_ID,
            "external_id": external_id,
            "legal_name": legal_name,
            "phone": phone,
            "email": email,
            "address": address
        })
        
        return merchant_id
        
    except Exception as e:
        log(f"Error upserting merchant for org {org.get('id')}: {str(e)}")
        return None


def upsert_deal(conn, merchant_id: str, deal: dict):
    """Insert or update deal from Pipedrive deal."""
    try:
        deal_id = f"pipedrive_deal_{deal['id']}"
        
        # Map Pipedrive status to our status
        status_mapping = {
            "open": "open",
            "won": "completed", 
            "lost": "declined",
            "deleted": "cancelled"
        }
        
        status = status_mapping.get(deal.get("status"), "open")
        funding_amount = deal.get("value")
        
        conn.execute(text("""
            INSERT OR REPLACE INTO deals 
            (id, tenant_id, merchant_id, status, funding_amount, created_at, updated_at)
            VALUES (:id, :tenant_id, :merchant_id, :status, :funding_amount, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": deal_id,
            "tenant_id": TENANT_ID,
            "merchant_id": merchant_id,
            "status": status,
            "funding_amount": funding_amount
        })
        
        return deal_id
        
    except Exception as e:
        log(f"Error upserting deal {deal.get('id')}: {str(e)}")
        return None


async def download_files(client: httpx.AsyncClient, files: list):
    """Download files and optionally store for document processing."""
    downloaded = []
    
    for file_data in files:
        try:
            file_id = file_data.get("id")
            filename = file_data.get("name", f"file_{file_id}")
            download_url = file_data.get("download_url")
            
            if not download_url:
                continue
            
            # Download file
            response = await client.get(download_url)
            response.raise_for_status()
            
            # Save to data directory
            os.makedirs("data/pipedrive_files", exist_ok=True)
            filepath = f"data/pipedrive_files/{file_id}_{filename}"
            
            with open(filepath, "wb") as f:
                f.write(response.content)
            
            downloaded.append({
                "file_id": file_id,
                "filename": filename,
                "filepath": filepath,
                "size": len(response.content)
            })
            
            log(f"Downloaded file: {filename} ({len(response.content)} bytes)")
            
            await asyncio.sleep(REQUEST_DELAY)
            
        except Exception as e:
            log(f"Error downloading file {file_data.get('id')}: {str(e)}")
    
    return downloaded


async def trigger_metrics_recompute(deal_id: str):
    """Trigger metrics recomputation for a deal via API."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            headers = {"Authorization": f"Bearer {API_KEY}"}
            response = await client.post(
                f"{API_BASE}/api/deals/{deal_id}/metrics/recompute",
                headers=headers
            )
            if response.status_code == 200:
                log(f"Triggered metrics recompute for deal {deal_id}")
            else:
                log(f"Failed to trigger metrics for deal {deal_id}: {response.status_code}")
    except Exception as e:
        log(f"Error triggering metrics for deal {deal_id}: {str(e)}")


async def main():
    """Main ETL process."""
    if not PIPEDRIVE_API_TOKEN:
        log("ERROR: PIPEDRIVE_API_TOKEN environment variable is required")
        sys.exit(1)
    
    log("Starting Pipedrive ETL process...")
    
    # Create database connection
    engine = create_database_engine()
    
    async with httpx.AsyncClient(timeout=30) as client:
        log("Fetching organizations from Pipedrive...")
        organizations = await fetch_all_paginated(client, "organizations")
        
        log("Fetching deals from Pipedrive...")
        deals = await fetch_all_paginated(client, "deals")
        
        log("Fetching files from Pipedrive...")
        files = await fetch_all_paginated(client, "files")
    
    # Index deals by organization
    deals_by_org = {}
    for deal in deals:
        org_id = deal.get("org_id")
        if isinstance(org_id, dict):
            org_id = org_id.get("value")
        if org_id:
            deals_by_org.setdefault(org_id, []).append(deal)
    
    # Index files by deal
    files_by_deal = {}
    for file_data in files:
        deal_id = file_data.get("deal_id")
        if deal_id:
            files_by_deal.setdefault(deal_id, []).append(file_data)
    
    log("Importing data into database...")
    
    imported_merchants = 0
    imported_deals = 0
    deals_to_recompute = []
    
    with engine.begin() as conn:
        # Import organizations as merchants
        for org in organizations:
            merchant_id = upsert_merchant(conn, org)
            if merchant_id:
                imported_merchants += 1
                
                # Import related deals
                org_deals = deals_by_org.get(org["id"], [])
                for deal in org_deals:
                    deal_id = upsert_deal(conn, merchant_id, deal)
                    if deal_id:
                        imported_deals += 1
                        
                        # Check if deal has bank statement files
                        deal_files = files_by_deal.get(deal["id"], [])
                        statement_files = [
                            f for f in deal_files 
                            if any(ext in f.get("name", "").lower() 
                                  for ext in [".pdf", ".csv", ".xlsx", ".xls"])
                        ]
                        
                        if statement_files:
                            deals_to_recompute.append(deal_id)
    
    # Download bank statement files if any
    if files:
        log("Downloading relevant files...")
        async with httpx.AsyncClient(timeout=60) as client:
            await download_files(client, files)
    
    # Trigger metrics recomputation for deals with files
    if deals_to_recompute:
        log(f"Triggering metrics recomputation for {len(deals_to_recompute)} deals...")
        for deal_id in deals_to_recompute:
            await trigger_metrics_recompute(deal_id)
            await asyncio.sleep(1)  # Don't overwhelm the API
    
    log(f"""
ETL Summary:
- Organizations imported: {imported_merchants}
- Deals imported: {imported_deals}
- Files available: {len(files)}
- Deals queued for metrics: {len(deals_to_recompute)}
    """)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("ETL process interrupted")
    except Exception as e:
        log(f"ETL process failed: {str(e)}")
        sys.exit(1)