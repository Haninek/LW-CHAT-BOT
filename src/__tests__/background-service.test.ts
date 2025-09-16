import { BackgroundService } from '../services/background-service';
import { clearClient } from '../services/clear-client';
import { backgroundJobRepository } from '../repositories/background-job-repository';
import { eventRepository } from '../repositories/event-repository';
import { env } from '../lib/env';

// Mock dependencies
jest.mock('../services/clear-client');
jest.mock('../repositories/background-job-repository');
jest.mock('../repositories/event-repository');
jest.mock('../lib/env');

const mockClearClient = clearClient as jest.Mocked<typeof clearClient>;
const mockBackgroundJobRepository = backgroundJobRepository as jest.Mocked<typeof backgroundJobRepository>;
const mockEventRepository = eventRepository as jest.Mocked<typeof eventRepository>;

// Mock fetch for webhook testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BackgroundService', () => {
  let backgroundService: BackgroundService;

  beforeEach(() => {
    backgroundService = new BackgroundService();
    jest.clearAllMocks();
    
    // Mock environment
    (env as any).LENDWIZELY_WEBHOOK_URL = 'https://app.lendwizely.com/webhook';
  });

  describe('runBackgroundJob', () => {
    const mockJob = {
      id: 'job_123',
      client_id: 'client_456',
      status: 'queued' as const,
      person_json: JSON.stringify({
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01',
        ssn4: '1234'
      }),
      result_json: null,
      error: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    };

    it('should complete job successfully with clean results', async () => {
      // Mock clean search results
      const cleanResults = {
        records: {
          criminal: [],
          liens_judgments: [],
          OFAC: [],
        },
        identity: {
          name_match: true,
          dob_match: true,
          address_match: true,
        },
        search_metadata: {
          search_id: 'search_123',
          timestamp: '2024-01-01T00:00:00.000Z',
          provider: 'CLEAR_STUB',
        },
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setResult.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockResolvedValue(cleanResults);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.completed',
        client_id: 'client_456',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setStatus).toHaveBeenCalledWith('job_123', 'running');
      expect(mockClearClient.searchPerson).toHaveBeenCalledWith({
        first: 'John',
        last: 'Doe',
        dob: '1990-01-01',
        ssn4: '1234'
      });
      expect(mockBackgroundJobRepository.setResult).toHaveBeenCalledWith('job_123', {
        decision: 'OK',
        notes: ['No material adverse findings'],
        raw: cleanResults,
      });
      expect(mockEventRepository.recordEvent).toHaveBeenCalledWith({
        type: 'background.completed',
        client_id: 'client_456',
        data: {
          job_id: 'job_123',
          decision: 'OK',
          notes: ['No material adverse findings'],
        },
      });
      expect(mockFetch).toHaveBeenCalledWith('https://app.lendwizely.com/webhook', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('background.completed'),
      }));
    });

    it('should handle criminal records and set Review decision', async () => {
      const criminalResults = {
        records: {
          criminal: [
            {
              id: 'crim_001',
              type: 'Misdemeanor',
              description: 'Theft',
              date: '2020-01-01',
              jurisdiction: 'County Court',
            }
          ],
          liens_judgments: [],
          OFAC: [],
        },
        identity: {
          name_match: true,
          dob_match: true,
          address_match: true,
        },
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setResult.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockResolvedValue(criminalResults);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.completed',
        client_id: 'client_456',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setResult).toHaveBeenCalledWith('job_123', {
        decision: 'Review',
        notes: ['1 criminal record(s) found'],
        raw: criminalResults,
      });
    });

    it('should handle OFAC hits and set Decline decision', async () => {
      const ofacResults = {
        records: {
          criminal: [],
          liens_judgments: [],
          OFAC: [
            {
              id: 'ofac_001',
              list_name: 'SDN List',
              match_type: 'Strong',
              score: 95,
            }
          ],
        },
        identity: {
          name_match: true,
          dob_match: true,
          address_match: true,
        },
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setResult.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockResolvedValue(ofacResults);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.completed',
        client_id: 'client_456',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setResult).toHaveBeenCalledWith('job_123', {
        decision: 'Decline',
        notes: ['Potential sanctions/OFAC hit detected'],
        raw: ofacResults,
      });
    });

    it('should handle identity mismatch and set Review decision', async () => {
      const mismatchResults = {
        records: {
          criminal: [],
          liens_judgments: [],
          OFAC: [],
        },
        identity: {
          name_match: false,
          dob_match: false,
          address_match: true,
        },
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setResult.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockResolvedValue(mismatchResults);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.completed',
        client_id: 'client_456',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setResult).toHaveBeenCalledWith('job_123', {
        decision: 'Review',
        notes: ['Identity verification concerns'],
        raw: mismatchResults,
      });
    });

    it('should handle job not found', async () => {
      mockBackgroundJobRepository.getJob.mockResolvedValue(null);

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setStatus).not.toHaveBeenCalled();
      expect(mockClearClient.searchPerson).not.toHaveBeenCalled();
    });

    it('should handle invalid person JSON', async () => {
      const invalidJob = {
        ...mockJob,
        person_json: 'invalid json',
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(invalidJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(invalidJob);

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setStatus).toHaveBeenCalledWith(
        'job_123',
        'failed',
        'Invalid person data format'
      );
    });

    it('should handle search provider errors', async () => {
      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockRejectedValue(new Error('Provider error'));

      await backgroundService.runBackgroundJob('job_123');

      expect(mockBackgroundJobRepository.setStatus).toHaveBeenCalledWith(
        'job_123',
        'failed',
        'Provider error'
      );
    });

    it('should continue processing if webhook fails', async () => {
      const cleanResults = {
        records: { criminal: [], liens_judgments: [], OFAC: [] },
        identity: { name_match: true, dob_match: true, address_match: true },
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setResult.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockResolvedValue(cleanResults);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.completed',
        client_id: 'client_456',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });
      mockFetch.mockRejectedValue(new Error('Webhook failed'));

      await backgroundService.runBackgroundJob('job_123');

      // Job should still complete successfully
      expect(mockBackgroundJobRepository.setResult).toHaveBeenCalledWith('job_123', {
        decision: 'OK',
        notes: ['No material adverse findings'],
        raw: cleanResults,
      });
    });

    it('should not send webhook if URL not configured', async () => {
      (env as any).LENDWIZELY_WEBHOOK_URL = undefined;

      const cleanResults = {
        records: { criminal: [], liens_judgments: [], OFAC: [] },
        identity: { name_match: true, dob_match: true, address_match: true },
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setStatus.mockResolvedValue(mockJob);
      mockBackgroundJobRepository.setResult.mockResolvedValue(mockJob);
      mockClearClient.searchPerson.mockResolvedValue(cleanResults);
      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'background.completed',
        client_id: 'client_456',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });

      await backgroundService.runBackgroundJob('job_123');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status successfully', async () => {
      const mockJob = {
        id: 'job_123',
        client_id: 'client_456',
        status: 'completed' as const,
        person_json: '{}',
        result_json: JSON.stringify({
          decision: 'OK',
          notes: ['No material adverse findings'],
          raw: {},
        }),
        error: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);

      const result = await backgroundService.getJobStatus('job_123');

      expect(result).toEqual({
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
      });
    });

    it('should return null for non-existent job', async () => {
      mockBackgroundJobRepository.getJob.mockResolvedValue(null);

      const result = await backgroundService.getJobStatus('job_123');

      expect(result).toBeNull();
    });

    it('should handle invalid result JSON', async () => {
      const mockJob = {
        id: 'job_123',
        client_id: 'client_456',
        status: 'completed' as const,
        person_json: '{}',
        result_json: 'invalid json',
        error: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockBackgroundJobRepository.getJob.mockResolvedValue(mockJob);

      const result = await backgroundService.getJobStatus('job_123');

      expect(result?.result).toBeUndefined();
    });
  });
});