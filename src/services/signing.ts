import { env } from '../lib/env';
import { AppError } from '../middleware/error';

interface SigningResult {
  provider: 'docusign' | 'dropboxsign';
  envelope_id: string;
}

export class SigningService {
  async sendAgreement(
    email: string,
    name: string,
    pdfBase64: string,
    subject: string = 'Your Working Capital Agreement',
    message: string = 'Please review and sign.'
  ): Promise<SigningResult> {
    if (env.SIGN_PROVIDER === 'docusign') {
      return await this.sendDocuSign(email, name, pdfBase64, subject, message);
    } else if (env.SIGN_PROVIDER === 'dropboxsign') {
      return await this.sendDropboxSign(email, name, pdfBase64, subject, message);
    } else {
      throw new AppError(
        `Unknown signing provider: ${env.SIGN_PROVIDER}`,
        500,
        'UNKNOWN_SIGN_PROVIDER'
      );
    }
  }

  private async sendDocuSign(
    email: string,
    name: string,
    pdfBase64: string,
    subject: string,
    message: string
  ): Promise<SigningResult> {
    try {
      // In a real implementation, this would make an HTTP request to DocuSign
      // For now, we'll generate a mock envelope ID for testing
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const envelope_id = `env_${timestamp}`;

      // Mock DocuSign envelope creation
      const envelopeDefinition = {
        emailSubject: subject,
        emailMessage: message,
        documents: [{
          documentBase64: pdfBase64,
          name: 'Agreement.pdf',
          fileExtension: 'pdf',
          documentId: '1'
        }],
        recipients: {
          signers: [{
            email,
            name,
            recipientId: '1',
            tabs: {
              signHereTabs: [{
                anchorString: '/sn1/',
                anchorXOffset: '20',
                anchorYOffset: '10'
              }]
            }
          }]
        },
        status: 'sent'
      };

      // In production, make actual HTTP request:
      /*
      const response = await fetch(`${env.DOCUSIGN_BASE}/restapi/v2.1/accounts/${env.DOCUSIGN_ACCOUNT_ID}/envelopes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.DOCUSIGN_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envelopeDefinition)
      });

      if (!response.ok) {
        throw new Error(`DocuSign API error: ${response.status}`);
      }

      const result = await response.json();
      envelope_id = result.envelopeId;
      */

      return {
        provider: 'docusign',
        envelope_id
      };
    } catch (error) {
      throw new AppError(
        'Failed to send DocuSign envelope',
        503,
        'DOCUSIGN_SEND_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async sendDropboxSign(
    email: string,
    name: string,
    pdfBase64: string,
    subject: string,
    message: string
  ): Promise<SigningResult> {
    try {
      // In a real implementation, this would make an HTTP request to Dropbox Sign
      // For now, we'll generate a mock signature request ID for testing
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const envelope_id = `hsr_${timestamp}`;

      // Mock Dropbox Sign signature request
      const signatureRequest = {
        title: subject,
        subject: subject,
        message: message,
        signers: [{
          email_address: email,
          name: name,
          order: 0
        }],
        files: [{
          name: 'Agreement.pdf',
          file: pdfBase64
        }],
        test_mode: env.NODE_ENV !== 'production'
      };

      // In production, make actual HTTP request:
      /*
      const response = await fetch('https://api.hellosign.com/v3/signature_request/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(env.DROPBOX_SIGN_API_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signatureRequest)
      });

      if (!response.ok) {
        throw new Error(`Dropbox Sign API error: ${response.status}`);
      }

      const result = await response.json();
      envelope_id = result.signature_request.signature_request_id;
      */

      return {
        provider: 'dropboxsign',
        envelope_id
      };
    } catch (error) {
      throw new AppError(
        'Failed to send Dropbox Sign request',
        503,
        'DROPBOXSIGN_SEND_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  verifyWebhook(headers: Record<string, string>, bodyBytes: Buffer): boolean {
    // Placeholder verification
    // In production, implement provider-specific webhook verification:
    
    if (env.SIGN_PROVIDER === 'docusign') {
      // DocuSign webhook verification would check HMAC signature
      // using Connect Key from DocuSign Connect configuration
      return true;
    } else if (env.SIGN_PROVIDER === 'dropboxsign') {
      // Dropbox Sign webhook verification would check HMAC signature
      // using API key and event hash
      return true;
    }

    return false;
  }

  // Helper method to normalize webhook data from different providers
  normalizeWebhookData(body: any): {
    envelope_id: string;
    status: string;
    client_id?: string;
    completed_at?: string;
  } {
    if (env.SIGN_PROVIDER === 'docusign') {
      // DocuSign webhook structure
      return {
        envelope_id: body.envelopeId || body.envelope_id || '',
        status: this.normalizeDocuSignStatus(body.status || ''),
        client_id: body.customFields?.textCustomFields?.find((f: any) => f.name === 'client_id')?.value,
        completed_at: body.status === 'completed' ? new Date().toISOString() : undefined
      };
    } else if (env.SIGN_PROVIDER === 'dropboxsign') {
      // Dropbox Sign webhook structure
      const event = body.event || {};
      return {
        envelope_id: event.signature_request_id || body.signature_request_id || '',
        status: this.normalizeDropboxSignStatus(event.event_type || body.event_type || ''),
        client_id: event.signature_request?.custom_fields?.find((f: any) => f.name === 'client_id')?.value,
        completed_at: event.event_type === 'signature_request_all_signed' ? new Date().toISOString() : undefined
      };
    }

    // Fallback for generic webhook format
    return {
      envelope_id: body.envelope_id || body.request_id || '',
      status: body.status || '',
      client_id: body.client_id,
      completed_at: body.completed_at
    };
  }

  private normalizeDocuSignStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'sent',
      'completed': 'completed',
      'declined': 'declined',
      'voided': 'error',
      'expired': 'error'
    };
    return statusMap[status.toLowerCase()] || 'error';
  }

  private normalizeDropboxSignStatus(eventType: string): string {
    const statusMap: Record<string, string> = {
      'signature_request_sent': 'sent',
      'signature_request_viewed': 'sent',
      'signature_request_signed': 'sent',
      'signature_request_all_signed': 'completed',
      'signature_request_declined': 'declined',
      'signature_request_canceled': 'error',
      'signature_request_expired': 'error'
    };
    return statusMap[eventType] || 'error';
  }
}

export const signingService = new SigningService();