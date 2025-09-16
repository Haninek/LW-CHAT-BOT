import { SigningService } from '../services/signing';
import { env } from '../lib/env';

// Mock the environment
jest.mock('../lib/env', () => ({
  env: {
    SIGN_PROVIDER: 'docusign',
    NODE_ENV: 'test'
  }
}));

describe('SigningService', () => {
  let signingService: SigningService;

  beforeEach(() => {
    signingService = new SigningService();
  });

  describe('sendAgreement', () => {
    it('should send DocuSign agreement successfully', async () => {
      const result = await signingService.sendAgreement(
        'test@example.com',
        'Test User',
        'base64pdfcontent',
        'Test Agreement',
        'Please sign this test agreement'
      );

      expect(result.provider).toBe('docusign');
      expect(result.envelope_id).toMatch(/^env_\d{14}$/);
    });

    it('should send Dropbox Sign agreement successfully', async () => {
      // Temporarily change provider
      (env as any).SIGN_PROVIDER = 'dropboxsign';

      const result = await signingService.sendAgreement(
        'test@example.com',
        'Test User',
        'base64pdfcontent',
        'Test Agreement',
        'Please sign this test agreement'
      );

      expect(result.provider).toBe('dropboxsign');
      expect(result.envelope_id).toMatch(/^hsr_\d{14}$/);

      // Reset provider
      (env as any).SIGN_PROVIDER = 'docusign';
    });

    it('should throw error for unknown provider', async () => {
      // Set invalid provider
      (env as any).SIGN_PROVIDER = 'unknown';

      await expect(
        signingService.sendAgreement(
          'test@example.com',
          'Test User',
          'base64pdfcontent'
        )
      ).rejects.toThrow('Unknown signing provider: unknown');

      // Reset provider
      (env as any).SIGN_PROVIDER = 'docusign';
    });

    it('should use default subject and message when not provided', async () => {
      const result = await signingService.sendAgreement(
        'test@example.com',
        'Test User',
        'base64pdfcontent'
      );

      expect(result.provider).toBe('docusign');
      expect(result.envelope_id).toBeDefined();
    });
  });

  describe('verifyWebhook', () => {
    it('should return true for valid webhook (placeholder)', () => {
      const headers = { 'content-type': 'application/json' };
      const body = Buffer.from('{"test": "data"}');

      const result = signingService.verifyWebhook(headers, body);

      expect(result).toBe(true);
    });
  });

  describe('normalizeWebhookData', () => {
    it('should normalize DocuSign webhook data', () => {
      (env as any).SIGN_PROVIDER = 'docusign';

      const docusignWebhook = {
        envelopeId: 'env_12345',
        status: 'completed',
        customFields: {
          textCustomFields: [
            { name: 'client_id', value: 'client_123' }
          ]
        }
      };

      const result = signingService.normalizeWebhookData(docusignWebhook);

      expect(result.envelope_id).toBe('env_12345');
      expect(result.status).toBe('completed');
      expect(result.client_id).toBe('client_123');
      expect(result.completed_at).toBeDefined();
    });

    it('should normalize Dropbox Sign webhook data', () => {
      (env as any).SIGN_PROVIDER = 'dropboxsign';

      const dropboxWebhook = {
        event: {
          signature_request_id: 'hsr_12345',
          event_type: 'signature_request_all_signed',
          signature_request: {
            custom_fields: [
              { name: 'client_id', value: 'client_123' }
            ]
          }
        }
      };

      const result = signingService.normalizeWebhookData(dropboxWebhook);

      expect(result.envelope_id).toBe('hsr_12345');
      expect(result.status).toBe('completed');
      expect(result.client_id).toBe('client_123');
      expect(result.completed_at).toBeDefined();

      // Reset provider
      (env as any).SIGN_PROVIDER = 'docusign';
    });

    it('should handle generic webhook format', () => {
      const genericWebhook = {
        envelope_id: 'generic_12345',
        status: 'completed',
        client_id: 'client_123'
      };

      const result = signingService.normalizeWebhookData(genericWebhook);

      expect(result.envelope_id).toBe('generic_12345');
      expect(result.status).toBe('completed');
      expect(result.client_id).toBe('client_123');
    });
  });

  describe('status normalization', () => {
    it('should normalize DocuSign statuses correctly', () => {
      const testCases = [
        { input: 'sent', expected: 'sent' },
        { input: 'delivered', expected: 'sent' },
        { input: 'completed', expected: 'completed' },
        { input: 'declined', expected: 'declined' },
        { input: 'voided', expected: 'error' },
        { input: 'expired', expected: 'error' },
        { input: 'unknown', expected: 'error' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = signingService.normalizeWebhookData({ status: input });
        expect(result.status).toBe(expected);
      });
    });

    it('should normalize Dropbox Sign event types correctly', () => {
      (env as any).SIGN_PROVIDER = 'dropboxsign';

      const testCases = [
        { input: 'signature_request_sent', expected: 'sent' },
        { input: 'signature_request_viewed', expected: 'sent' },
        { input: 'signature_request_signed', expected: 'sent' },
        { input: 'signature_request_all_signed', expected: 'completed' },
        { input: 'signature_request_declined', expected: 'declined' },
        { input: 'signature_request_canceled', expected: 'error' },
        { input: 'signature_request_expired', expected: 'error' },
        { input: 'unknown_event', expected: 'error' }
      ];

      testCases.forEach(({ input, expected }) => {
        const webhook = {
          event: {
            event_type: input,
            signature_request_id: 'test_123'
          }
        };
        const result = signingService.normalizeWebhookData(webhook);
        expect(result.status).toBe(expected);
      });

      // Reset provider
      (env as any).SIGN_PROVIDER = 'docusign';
    });
  });
});