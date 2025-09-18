"""Migration script to convert connectors table to multi-tenant schema."""

from sqlalchemy import text
from core.database import engine, get_db
from models.connector import Connector
from models.tenant import Tenant
import json


def migrate_connectors_to_multitenant():
    """Migrate connectors table from single-tenant to multi-tenant schema."""
    
    with engine.connect() as conn:
        # Check if migration is needed
        result = conn.execute(text("PRAGMA table_info(connectors)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'tenant_id' in columns:
            print("✅ Connectors table already has tenant_id column - no migration needed")
            return
        
        print("🔄 Migrating connectors table to multi-tenant schema...")
        
        # Begin transaction
        trans = conn.begin()
        
        try:
            # 1. Check if there are existing connectors to backup
            result = conn.execute(text("SELECT COUNT(*) FROM connectors"))
            existing_count = result.fetchone()[0]
            
            if existing_count > 0:
                print(f"📁 Backing up {existing_count} existing connector(s)...")
                
                # Backup existing data
                result = conn.execute(text("SELECT name, encrypted_config, updated_at FROM connectors"))
                existing_connectors = result.fetchall()
            else:
                existing_connectors = []
            
            # 2. Drop old table
            print("🗑️  Dropping old connectors table...")
            conn.execute(text("DROP TABLE connectors"))
            
            # 3. Create new table with multi-tenant schema
            print("🏗️  Creating new multi-tenant connectors table...")
            conn.execute(text("""
                CREATE TABLE connectors (
                    tenant_id VARCHAR NOT NULL, 
                    name VARCHAR NOT NULL, 
                    encrypted_config TEXT NOT NULL, 
                    created_at DATETIME, 
                    updated_at DATETIME, 
                    PRIMARY KEY (tenant_id, name), 
                    FOREIGN KEY(tenant_id) REFERENCES tenants (id)
                )
            """))
            
            # 4. Create index on tenant_id for performance
            conn.execute(text("CREATE INDEX ix_connectors_tenant_id ON connectors (tenant_id)"))
            
            # 5. Restore data with default tenant if there were existing connectors
            if existing_connectors:
                # Ensure default tenant exists
                result = conn.execute(text("SELECT COUNT(*) FROM tenants WHERE id = 'default'"))
                if result.fetchone()[0] == 0:
                    print("🏢 Creating default tenant for existing connectors...")
                    conn.execute(text("""
                        INSERT INTO tenants (id, name, created_at, updated_at) 
                        VALUES ('default', 'Default Tenant', datetime('now'), datetime('now'))
                    """))
                
                print(f"📦 Restoring {len(existing_connectors)} connector(s) under default tenant...")
                for name, encrypted_config, updated_at in existing_connectors:
                    conn.execute(text("""
                        INSERT INTO connectors (tenant_id, name, encrypted_config, created_at, updated_at)
                        VALUES ('default', :name, :encrypted_config, datetime('now'), :updated_at)
                    """), {
                        'name': name,
                        'encrypted_config': encrypted_config,
                        'updated_at': updated_at
                    })
            
            # Commit transaction
            trans.commit()
            print("✅ Migration completed successfully!")
            
            # Verify new schema
            result = conn.execute(text("PRAGMA table_info(connectors)"))
            columns = [(row[1], row[2], row[5]) for row in result.fetchall()]
            print("\n📋 New connectors table schema:")
            for name, type_, pk in columns:
                print(f"  {name} ({type_}) - PK: {'Yes' if pk else 'No'}")
            
            result = conn.execute(text("SELECT COUNT(*) FROM connectors"))
            count = result.fetchone()[0]
            print(f"\n📊 Total connectors after migration: {count}")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    migrate_connectors_to_multitenant()