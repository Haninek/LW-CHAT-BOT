import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { env } from '../env';
import path from 'path';
import fs from 'fs';

export interface DatabaseRow {
  [key: string]: any;
}

export class Database {
  private db: sqlite3.Database | null = null;
  private static instance: Database | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Parse SQLite URL (sqlite:///./data.db -> ./data.db)
      const dbUrl = env.DATABASE_URL;
      let dbPath: string;
      
      if (dbUrl.startsWith('sqlite:///')) {
        dbPath = dbUrl.replace('sqlite:///', '');
      } else if (dbUrl.startsWith('sqlite://')) {
        dbPath = dbUrl.replace('sqlite://', '');
      } else {
        dbPath = dbUrl;
      }

      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database:', dbPath);
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get<T = DatabaseRow>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = DatabaseRow>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async createTables(): Promise<void> {
    // Clients table
    const createClientsTable = `
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        email TEXT,
        consent_opted_in BOOLEAN DEFAULT 1,
        consent_revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createClientsIndex = `
      CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)
    `;

    const createClientsUpdatedAtTrigger = `
      CREATE TRIGGER IF NOT EXISTS clients_updated_at 
      AFTER UPDATE ON clients
      BEGIN
        UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;

    // Agreements table
    const createAgreementsTable = `
      CREATE TABLE IF NOT EXISTS agreements (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        envelope_id TEXT NOT NULL,
        status TEXT DEFAULT 'sent',
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createAgreementsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_agreements_client_id ON agreements(client_id);
      CREATE INDEX IF NOT EXISTS idx_agreements_envelope_id ON agreements(envelope_id);
    `;

    const createAgreementsUpdatedAtTrigger = `
      CREATE TRIGGER IF NOT EXISTS agreements_updated_at 
      AFTER UPDATE ON agreements
      BEGIN
        UPDATE agreements SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;

    // Events table
    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        client_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createEventsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    `;

    // Execute all table creation
    await this.run(createClientsTable);
    await this.run(createClientsIndex);
    await this.run(createClientsUpdatedAtTrigger);

    await this.run(createAgreementsTable);
    await this.run(createAgreementsIndexes);
    await this.run(createAgreementsUpdatedAtTrigger);

    await this.run(createEventsTable);
    await this.run(createEventsIndexes);

    console.log('✅ Database tables created/verified');
  }
}

export const database = Database.getInstance();