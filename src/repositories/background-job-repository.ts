import { v4 as uuidv4 } from 'uuid';
import { database } from '../lib/db/connection';
import { BackgroundJob, CreateBackgroundJobData, UpdateBackgroundJobData } from '../models/background-job';
import { BackgroundJobStatus } from '../types/background';
import { AppError } from '../middleware/error';

export class BackgroundJobRepository {
  async createJob(data: CreateBackgroundJobData): Promise<BackgroundJob> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      await database.run(
        `INSERT INTO background_jobs (id, client_id, status, person_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, data.client_id, data.status || 'queued', data.person_json, now, now]
      );

      const job = await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [id]
      );

      if (!job) {
        throw new AppError('Failed to create background job', 500, 'JOB_CREATION_FAILED');
      }

      return job;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Database error during job creation',
        500,
        'JOB_CREATION_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async setStatus(
    jobId: string, 
    status: BackgroundJobStatus,
    error?: string | null
  ): Promise<BackgroundJob | null> {
    try {
      const job = await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );

      if (!job) {
        return null;
      }

      await database.run(
        'UPDATE background_jobs SET status = ?, error = ? WHERE id = ?',
        [status, error || null, jobId]
      );

      return await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during job status update',
        500,
        'JOB_STATUS_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async setResult(jobId: string, result: object): Promise<BackgroundJob | null> {
    try {
      const job = await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );

      if (!job) {
        return null;
      }

      const resultJson = JSON.stringify(result);
      
      await database.run(
        'UPDATE background_jobs SET status = ?, result_json = ? WHERE id = ?',
        ['completed', resultJson, jobId]
      );

      return await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during job result update',
        500,
        'JOB_RESULT_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async getJob(jobId: string): Promise<BackgroundJob | null> {
    try {
      const job = await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );

      return job || null;
    } catch (error) {
      throw new AppError(
        'Database error during job lookup',
        500,
        'JOB_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findJobsByClientId(clientId: string): Promise<BackgroundJob[]> {
    try {
      return await database.all<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during client jobs lookup',
        500,
        'CLIENT_JOBS_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findJobsByStatus(status: BackgroundJobStatus, limit = 100): Promise<BackgroundJob[]> {
    try {
      return await database.all<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?',
        [status, limit]
      );
    } catch (error) {
      throw new AppError(
        'Database error during status jobs lookup',
        500,
        'STATUS_JOBS_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async updateJob(jobId: string, data: UpdateBackgroundJobData): Promise<BackgroundJob | null> {
    try {
      const job = await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );

      if (!job) {
        return null;
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
      }

      if (data.result_json !== undefined) {
        updates.push('result_json = ?');
        params.push(data.result_json);
      }

      if (data.error !== undefined) {
        updates.push('error = ?');
        params.push(data.error);
      }

      if (updates.length === 0) {
        return job;
      }

      params.push(jobId);

      await database.run(
        `UPDATE background_jobs SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await database.get<BackgroundJob>(
        'SELECT * FROM background_jobs WHERE id = ?',
        [jobId]
      );
    } catch (error) {
      throw new AppError(
        'Database error during job update',
        500,
        'JOB_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

export const backgroundJobRepository = new BackgroundJobRepository();