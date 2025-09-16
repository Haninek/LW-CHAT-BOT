import { BackgroundJobStatus } from '../types/background';

export interface BackgroundJob {
  id: string;
  client_id: string;
  status: BackgroundJobStatus;
  person_json: string; // JSON string with minimal PII
  result_json?: string | null; // JSON string with BackgroundFlags
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBackgroundJobData {
  client_id: string;
  person_json: string;
  status?: BackgroundJobStatus;
}

export interface UpdateBackgroundJobData {
  status?: BackgroundJobStatus;
  result_json?: string | null;
  error?: string | null;
}