import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const db = new Database(process.env.DATABASE_URL || './data/lendwizely.db');

// Create tables
const createTables = () => {
  // Clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      consent_sms BOOLEAN DEFAULT FALSE,
      consent_email BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Signing requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS signing_requests (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      envelope_id TEXT UNIQUE NOT NULL,
      document_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // Background checks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS background_checks (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      decision TEXT,
      notes TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      request_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      client_id TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database tables created successfully');
};

// Run migrations
const runMigrations = () => {
  try {
    createTables();
    console.log('🚀 Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };