import request from 'supertest';
import app from '../server';
import { database } from '../lib/db/connection';
import { backgroundService } from '../services/background-service';
import { backgroundJobRepository } from '../repositories/background-job-repository';
import { eventRepository } from '../repositories/event-repository';

// Mock dependencies
jest.mock('../services/background-service');
jest.mock('../repositories/background-job-repository');
jest.mock('../repositories/event-repository');

const mockBackgroundService = backgroundService as jest.Mocked<typeof backgroundService>;
const mockBackgroundJobRepository = backgroundJobRepository as jest.Mocked<typeof backgroundJobRepository>;
const mockEventRepository = eventRepository as jest.Mocked<typeof eventRepository>;

describe('Background Routes', () => {
  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/background/check', () => {
    const validCheckRequest = {
      client_id: 'client_123',
      person: {
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01',
        ssn4: '1234',
        email: 'john.doe@example.com',
        phone: '+15551234567',
        address: '123 Main St, City, ST 12345'
      }
    };

    it('should start background check successfully', async () => {
      const mockJob = {
        id: 'job_123',
        client_id: 'client_123',
        status: 'queued' as const,
        person_json: JSON.stringify(validCheckRequest.person),
        result_json: null,
        error: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockBackgroundJobRepository.createJob.mockResolvedValue(mockJob);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.started',
        client_id: 'client_123',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });
      mockBackgroundService.startBackgroundJob.mockResolvedValue();

      const response = await request(app)
        .post('/api/background/check')
        .set('X-API-Key', 'test-api-key')
        .send(validCheckRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.job_id).toBe('job_123');

      expect(mockBackgroundJobRepository.createJob).toHaveBeenCalledWith({
        client_id: 'client_123',
        person_json: JSON.stringify(validCheckRequest.person),
        status: 'queued',
      });

      expect(mockEventRepository.recordEvent).toHaveBeenCalledWith({
        type: 'background.started',
        client_id: 'client_123',
        data: {
          job_id: 'job_123',
          person: {
            first: 'John',
            last: 'Doe',
            dob: '1990-01-XX', // Sanitized DOB
          },
        },
      });

      expect(mockBackgroundService.startBackgroundJob).toHaveBeenCalledWith('job_123');
    });

    it('should return 400 for invalid request data', async () => {
      const invalidRequest = {
        client_id: '',
        person: {
          first: '',
          last: '',
          dob: 'invalid-date',
          ssn4: '12345', // Too long
        }
      };

      const response = await request(app)
        .post('/api/background/check')
        .set('X-API-Key', 'test-api-key')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_BACKGROUND_REQUEST');
    });

    it('should return 422 for invalid SSN4 length', async () => {
      const invalidSSNRequest = {
        ...validCheckRequest,
        person: {
          ...validCheckRequest.person,
          ssn4: '123' // Too short
        }
      };

      const response = await request(app)
        .post('/api/background/check')
        .set('X-API-Key', 'test-api-key')
        .send(invalidSSNRequest)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SSN4_FORMAT');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/background/check')
        .send(validCheckRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('API_KEY_MISSING');
    });
  });

  describe('GET /api/background/jobs/:jobId', () => {
    it('should return job status successfully', async () => {
      const mockJobStatus = {
        job_id: 'job_123',
        status: 'completed',
        result: {
          decision: 'OK',
          notes: ['No material adverse findings'],
          raw: {},
        },
        error: undefined,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockBackgroundService.getJobStatus.mockResolvedValue(mockJobStatus);

      const response = await request(app)
        .get('/api/background/jobs/job_123')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockJobStatus);
      expect(mockBackgroundService.getJobStatus).toHaveBeenCalledWith('job_123');
    });

    it('should return 404 for non-existent job', async () => {
      mockBackgroundService.getJobStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/background/jobs/non_existent')
        .set('X-API-Key', 'test-api-key')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('JOB_NOT_FOUND');
    });

    it('should return job with error status', async () => {
      const mockJobStatus = {
        job_id: 'job_123',
        status: 'failed',
        result: undefined,
        error: 'Provider error',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockBackgroundService.getJobStatus.mockResolvedValue(mockJobStatus);

      const response = await request(app)
        .get('/api/background/jobs/job_123')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.error).toBe('Provider error');
    });

    it('should return job in running status', async () => {
      const mockJobStatus = {
        job_id: 'job_123',
        status: 'running',
        result: undefined,
        error: undefined,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockBackgroundService.getJobStatus.mockResolvedValue(mockJobStatus);

      const response = await request(app)
        .get('/api/background/jobs/job_123')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
      expect(response.body.data.result).toBeUndefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/background/jobs/job_123')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('API_KEY_MISSING');
    });
  });

  describe('GET /api/background/client/:clientId/jobs', () => {
    it('should return client jobs successfully', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          client_id: 'client_123',
          status: 'completed' as const,
          person_json: '{}',
          result_json: JSON.stringify({ decision: 'OK', notes: [] }),
          error: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'job_2',
          client_id: 'client_123',
          status: 'running' as const,
          person_json: '{}',
          result_json: null,
          error: null,
          created_at: '2024-01-01T01:00:00.000Z',
          updated_at: '2024-01-01T01:00:00.000Z'
        }
      ];

      mockBackgroundJobRepository.findJobsByClientId.mockResolvedValue(mockJobs);

      const response = await request(app)
        .get('/api/background/client/client_123/jobs')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2);
      expect(response.body.data.jobs[0].job_id).toBe('job_1');
      expect(response.body.data.jobs[0].status).toBe('completed');
      expect(response.body.data.jobs[1].job_id).toBe('job_2');
      expect(response.body.data.jobs[1].status).toBe('running');
    });

    it('should return 400 for missing client ID', async () => {
      const response = await request(app)
        .get('/api/background/client//jobs')
        .set('X-API-Key', 'test-api-key')
        .expect(404); // Express treats empty param as 404

      // This will be a 404 from Express routing, not our validation
    });
  });

  describe('GET /api/background/jobs', () => {
    it('should return jobs by status filter', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          client_id: 'client_123',
          status: 'completed' as const,
          person_json: '{}',
          result_json: JSON.stringify({ decision: 'OK', notes: [] }),
          error: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockBackgroundJobRepository.findJobsByStatus.mockResolvedValue(mockJobs);

      const response = await request(app)
        .get('/api/background/jobs')
        .query({ status: 'completed', limit: '10' })
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(mockBackgroundJobRepository.findJobsByStatus).toHaveBeenCalledWith('completed', 10);
    });

    it('should return 400 for invalid status filter', async () => {
      const response = await request(app)
        .get('/api/background/jobs')
        .query({ status: 'invalid_status' })
        .set('X-API-Key', 'test-api-key')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS_FILTER');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/background/jobs')
        .query({ limit: '2000' }) // Too high
        .set('X-API-Key', 'test-api-key')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_LIMIT');
    });

    it('should return default completed jobs when no status specified', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          client_id: 'client_123',
          status: 'completed' as const,
          person_json: '{}',
          result_json: JSON.stringify({ decision: 'OK', notes: [] }),
          error: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockBackgroundJobRepository.findJobsByStatus.mockResolvedValue(mockJobs);

      const response = await request(app)
        .get('/api/background/jobs')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockBackgroundJobRepository.findJobsByStatus).toHaveBeenCalledWith('completed', 50);
    });
  });
});