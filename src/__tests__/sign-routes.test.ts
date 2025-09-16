import request from 'supertest';
import app from '../server';
import { database } from '../lib/db/connection';
import { signingService } from '../services/signing';
import { agreementRepository } from '../repositories/agreement-repository';
import { eventRepository } from '../repositories/event-repository';

// Mock the signing service
jest.mock('../services/signing');
const mockSigningService = signingService as jest.Mocked<typeof signingService>;

// Mock repositories
jest.mock('../repositories/agreement-repository');
jest.mock('../repositories/event-repository');
const mockAgreementRepository = agreementRepository as jest.Mocked<typeof agreementRepository>;
const mockEventRepository = eventRepository as jest.Mocked<typeof eventRepository>;

describe('Sign Routes', () => {
  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sign/send', () => {
    const validSignRequest = {
      client_id: 'client_123',
      email: 'test@example.com',
      name: 'Test User',
      pdf_base64: 'dGVzdCBwZGYgY29udGVudA==', // base64 for "test pdf content"
      subject: 'Test Agreement',
      message: 'Please sign this test agreement'
    };

    it('should send agreement successfully', async () => {
      // Mock service responses
      mockSigningService.sendAgreement.mockResolvedValue({
        provider: 'docusign',
        envelope_id: 'env_12345'
      });

      mockAgreementRepository.createAgreement.mockResolvedValue({
        id: 'agreement_123',
        client_id: 'client_123',
        provider: 'docusign',
        envelope_id: 'env_12345',
        status: 'sent',
        completed_at: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      });

      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'sign.sent',
        client_id: 'client_123',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });

      const response = await request(app)
        .post('/api/sign/send')
        .set('X-API-Key', 'test-api-key')
        .send(validSignRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.envelope_id).toBe('env_12345');
      expect(response.body.data.provider).toBe('docusign');

      expect(mockSigningService.sendAgreement).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'dGVzdCBwZGYgY29udGVudA==',
        'Test Agreement',
        'Please sign this test agreement'
      );

      expect(mockAgreementRepository.createAgreement).toHaveBeenCalledWith({
        client_id: 'client_123',
        provider: 'docusign',
        envelope_id: 'env_12345',
        status: 'sent'
      });

      expect(mockEventRepository.recordEvent).toHaveBeenCalledWith({
        type: 'sign.sent',
        client_id: 'client_123',
        data: expect.objectContaining({
          envelope_id: 'env_12345',
          provider: 'docusign'
        })
      });
    });

    it('should return 400 for invalid request data', async () => {
      const invalidRequest = {
        client_id: '',
        email: 'invalid-email',
        name: '',
        pdf_base64: 'short'
      };

      const response = await request(app)
        .post('/api/sign/send')
        .set('X-API-Key', 'test-api-key')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGN_REQUEST');
    });

    it('should return 400 for PDF too large', async () => {
      const largeRequest = {
        ...validSignRequest,
        pdf_base64: 'A'.repeat(50 * 1024 * 1024) // Simulate 50MB base64
      };

      const response = await request(app)
        .post('/api/sign/send')
        .set('X-API-Key', 'test-api-key')
        .send(largeRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PDF_TOO_LARGE');
    });

    it('should return 502 when signing service fails', async () => {
      mockSigningService.sendAgreement.mockRejectedValue(new Error('Provider error'));

      const response = await request(app)
        .post('/api/sign/send')
        .set('X-API-Key', 'test-api-key')
        .send(validSignRequest)
        .expect(502);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SIGN_PROVIDER_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sign/send')
        .send(validSignRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('API_KEY_MISSING');
    });
  });

  describe('POST /api/sign/webhook', () => {
    const validWebhookPayload = {
      envelope_id: 'env_12345',
      status: 'completed',
      client_id: 'client_123'
    };

    it('should process webhook successfully', async () => {
      mockSigningService.verifyWebhook.mockReturnValue(true);
      mockSigningService.normalizeWebhookData.mockReturnValue({
        envelope_id: 'env_12345',
        status: 'completed',
        client_id: 'client_123',
        completed_at: '2024-01-01T00:00:00.000Z'
      });

      mockAgreementRepository.setAgreementStatus.mockResolvedValue({
        id: 'agreement_123',
        client_id: 'client_123',
        provider: 'docusign',
        envelope_id: 'env_12345',
        status: 'completed',
        completed_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      });

      mockEventRepository.recordEvent.mockResolvedValue({
        id: 'event_123',
        type: 'sign.completed',
        client_id: 'client_123',
        data: '{}',
        created_at: '2024-01-01T00:00:00.000Z'
      });

      const response = await request(app)
        .post('/api/sign/webhook')
        .set('X-API-Key', 'test-api-key')
        .send(validWebhookPayload)
        .expect(200);

      expect(response.body.ok).toBe(true);

      expect(mockSigningService.verifyWebhook).toHaveBeenCalled();
      expect(mockSigningService.normalizeWebhookData).toHaveBeenCalledWith(validWebhookPayload);
      expect(mockAgreementRepository.setAgreementStatus).toHaveBeenCalledWith(
        'env_12345',
        'completed',
        '2024-01-01T00:00:00.000Z'
      );
      expect(mockEventRepository.recordEvent).toHaveBeenCalledWith({
        type: 'sign.completed',
        client_id: 'client_123',
        data: expect.objectContaining({
          envelope_id: 'env_12345',
          status: 'completed'
        })
      });
    });

    it('should return 401 for invalid webhook signature', async () => {
      mockSigningService.verifyWebhook.mockReturnValue(false);

      const response = await request(app)
        .post('/api/sign/webhook')
        .set('X-API-Key', 'test-api-key')
        .send(validWebhookPayload)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    it('should return 400 for missing required data', async () => {
      mockSigningService.verifyWebhook.mockReturnValue(true);
      mockSigningService.normalizeWebhookData.mockReturnValue({
        envelope_id: '',
        status: 'completed'
      });

      const response = await request(app)
        .post('/api/sign/webhook')
        .set('X-API-Key', 'test-api-key')
        .send({ status: 'completed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_WEBHOOK_DATA');
    });

    it('should handle webhook for unknown envelope', async () => {
      mockSigningService.verifyWebhook.mockReturnValue(true);
      mockSigningService.normalizeWebhookData.mockReturnValue({
        envelope_id: 'unknown_envelope',
        status: 'completed'
      });

      mockAgreementRepository.setAgreementStatus.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/sign/webhook')
        .set('X-API-Key', 'test-api-key')
        .send({ envelope_id: 'unknown_envelope', status: 'completed' })
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe('GET /api/events', () => {
    it('should return events successfully', async () => {
      const mockEvents = [
        {
          id: 'event_1',
          type: 'sign.completed',
          client_id: 'client_123',
          data: '{"envelope_id": "env_12345"}',
          created_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'event_2',
          type: 'sign.sent',
          client_id: 'client_456',
          data: '{"envelope_id": "env_67890"}',
          created_at: '2024-01-01T01:00:00.000Z'
        }
      ];

      mockEventRepository.findEvents.mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/events')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events[0].id).toBe('event_1');
      expect(response.body.data.total).toBe(2);
    });

    it('should filter events by query parameters', async () => {
      mockEventRepository.findEvents.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/events')
        .query({
          client_id: 'client_123',
          type: 'sign.completed',
          since: '2024-01-01T00:00:00.000Z',
          limit: '50'
        })
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(mockEventRepository.findEvents).toHaveBeenCalledWith({
        clientId: 'client_123',
        type: 'sign.completed',
        since: '2024-01-01T00:00:00.000Z',
        limit: 50
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/events')
        .query({ limit: 'invalid' })
        .set('X-API-Key', 'test-api-key')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EVENTS_QUERY');
    });
  });

  describe('GET /api/sign/agreement/:envelopeId', () => {
    it('should return agreement successfully', async () => {
      const mockAgreement = {
        id: 'agreement_123',
        client_id: 'client_123',
        provider: 'docusign',
        envelope_id: 'env_12345',
        status: 'completed',
        completed_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockAgreementRepository.findByEnvelopeId.mockResolvedValue(mockAgreement);

      const response = await request(app)
        .get('/api/sign/agreement/env_12345')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agreement.envelope_id).toBe('env_12345');
    });

    it('should return 404 for unknown agreement', async () => {
      mockAgreementRepository.findByEnvelopeId.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/sign/agreement/unknown_envelope')
        .set('X-API-Key', 'test-api-key')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGREEMENT_NOT_FOUND');
    });
  });
});