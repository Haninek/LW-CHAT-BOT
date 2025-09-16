import { v4 as uuidv4 } from 'uuid';
import { database } from '../lib/db/connection';
import { Agreement, CreateAgreementData, UpdateAgreementData } from '../models/agreement';
import { AppError } from '../middleware/error';

export class AgreementRepository {
  async createAgreement(data: CreateAgreementData): Promise<Agreement> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      await database.run(
        `INSERT INTO agreements (id, client_id, provider, envelope_id, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.client_id, data.provider, data.envelope_id, data.status || 'sent', now, now]
      );

      const agreement = await database.get<Agreement>(
        'SELECT * FROM agreements WHERE id = ?',
        [id]
      );

      if (!agreement) {
        throw new AppError('Failed to create agreement', 500, 'AGREEMENT_CREATION_FAILED');
      }

      return agreement;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Database error during agreement creation',
        500,
        'AGREEMENT_CREATION_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async setAgreementStatus(
    envelopeId: string, 
    status: 'sent' | 'completed' | 'declined' | 'error',
    completedAt?: string | null
  ): Promise<Agreement | null> {
    try {
      const agreement = await database.get<Agreement>(
        'SELECT * FROM agreements WHERE envelope_id = ?',
        [envelopeId]
      );

      if (!agreement) {
        return null;
      }

      await database.run(
        'UPDATE agreements SET status = ?, completed_at = ? WHERE envelope_id = ?',
        [status, completedAt || null, envelopeId]
      );

      return await database.get<Agreement>(
        'SELECT * FROM agreements WHERE envelope_id = ?',
        [envelopeId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during agreement status update',
        500,
        'AGREEMENT_STATUS_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findByEnvelopeId(envelopeId: string): Promise<Agreement | null> {
    try {
      const agreement = await database.get<Agreement>(
        'SELECT * FROM agreements WHERE envelope_id = ?',
        [envelopeId]
      );

      return agreement || null;
    } catch (error) {
      throw new AppError(
        'Database error during agreement lookup',
        500,
        'AGREEMENT_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findByClientId(clientId: string): Promise<Agreement[]> {
    try {
      return await database.all<Agreement>(
        'SELECT * FROM agreements WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during client agreements lookup',
        500,
        'CLIENT_AGREEMENTS_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async updateAgreement(envelopeId: string, data: UpdateAgreementData): Promise<Agreement | null> {
    try {
      const agreement = await database.get<Agreement>(
        'SELECT * FROM agreements WHERE envelope_id = ?',
        [envelopeId]
      );

      if (!agreement) {
        return null;
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
      }

      if (data.completed_at !== undefined) {
        updates.push('completed_at = ?');
        params.push(data.completed_at);
      }

      if (updates.length === 0) {
        return agreement;
      }

      params.push(envelopeId);

      await database.run(
        `UPDATE agreements SET ${updates.join(', ')} WHERE envelope_id = ?`,
        params
      );

      return await database.get<Agreement>(
        'SELECT * FROM agreements WHERE envelope_id = ?',
        [envelopeId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during agreement update',
        500,
        'AGREEMENT_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

export const agreementRepository = new AgreementRepository();