import { v4 as uuidv4 } from 'uuid';
import { database } from '../lib/db/connection';
import { Client, CreateClientData, UpdateClientData } from '../models/client';
import { AppError } from '../middleware/error';

export class ClientRepository {
  async upsertClient(phone: string, email?: string | null): Promise<Client> {
    try {
      // First, try to find existing client
      const existing = await database.get<Client>(
        'SELECT * FROM clients WHERE phone = ?',
        [phone]
      );

      if (existing) {
        // Update email if provided and different
        if (email && existing.email !== email) {
          await database.run(
            'UPDATE clients SET email = ? WHERE phone = ?',
            [email, phone]
          );
          existing.email = email;
        }
        return existing;
      }

      // Create new client
      const id = uuidv4();
      const now = new Date().toISOString();

      await database.run(
        `INSERT INTO clients (id, phone, email, consent_opted_in, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, phone, email || null, true, now, now]
      );

      const newClient = await database.get<Client>(
        'SELECT * FROM clients WHERE id = ?',
        [id]
      );

      if (!newClient) {
        throw new AppError('Failed to create client', 500, 'CLIENT_CREATION_FAILED');
      }

      return newClient;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Database error during client upsert',
        500,
        'CLIENT_UPSERT_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async setOptOut(phone: string): Promise<Client | null> {
    try {
      const client = await database.get<Client>(
        'SELECT * FROM clients WHERE phone = ?',
        [phone]
      );

      if (!client) {
        return null;
      }

      const revokedAt = new Date().toISOString();
      await database.run(
        'UPDATE clients SET consent_opted_in = ?, consent_revoked_at = ? WHERE phone = ?',
        [false, revokedAt, phone]
      );

      return {
        ...client,
        consent_opted_in: false,
        consent_revoked_at: revokedAt,
      };
    } catch (error) {
      throw new AppError(
        'Database error during opt-out',
        500,
        'CLIENT_OPT_OUT_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async setOptIn(phone: string): Promise<Client | null> {
    try {
      const client = await database.get<Client>(
        'SELECT * FROM clients WHERE phone = ?',
        [phone]
      );

      if (!client) {
        return null;
      }

      await database.run(
        'UPDATE clients SET consent_opted_in = ?, consent_revoked_at = ? WHERE phone = ?',
        [true, null, phone]
      );

      return {
        ...client,
        consent_opted_in: true,
        consent_revoked_at: null,
      };
    } catch (error) {
      throw new AppError(
        'Database error during opt-in',
        500,
        'CLIENT_OPT_IN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findByPhone(phone: string): Promise<Client | null> {
    try {
      const client = await database.get<Client>(
        'SELECT * FROM clients WHERE phone = ?',
        [phone]
      );

      return client || null;
    } catch (error) {
      throw new AppError(
        'Database error during client lookup',
        500,
        'CLIENT_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findOptedInClients(): Promise<Client[]> {
    try {
      return await database.all<Client>(
        'SELECT * FROM clients WHERE consent_opted_in = ? ORDER BY created_at DESC',
        [true]
      );
    } catch (error) {
      throw new AppError(
        'Database error during opted-in clients lookup',
        500,
        'CLIENT_OPTED_IN_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async updateClient(phone: string, data: UpdateClientData): Promise<Client | null> {
    try {
      const client = await database.get<Client>(
        'SELECT * FROM clients WHERE phone = ?',
        [phone]
      );

      if (!client) {
        return null;
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email);
      }

      if (data.consent_opted_in !== undefined) {
        updates.push('consent_opted_in = ?');
        params.push(data.consent_opted_in);
      }

      if (data.consent_revoked_at !== undefined) {
        updates.push('consent_revoked_at = ?');
        params.push(data.consent_revoked_at);
      }

      if (updates.length === 0) {
        return client;
      }

      params.push(phone);
      
      await database.run(
        `UPDATE clients SET ${updates.join(', ')} WHERE phone = ?`,
        params
      );

      return await database.get<Client>(
        'SELECT * FROM clients WHERE phone = ?',
        [phone]
      );
    } catch (error) {
      throw new AppError(
        'Database error during client update',
        500,
        'CLIENT_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

export const clientRepository = new ClientRepository();