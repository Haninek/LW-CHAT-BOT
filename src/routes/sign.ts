import { Router, Request, Response, NextFunction } from 'express';
import {
  SignSendRequestSchema,
  SignSendResponse,
  SignWebhookRequestSchema,
  SignWebhookResponse,
  EventsQuerySchema,
  EventsListResponse,
  EventTypes
} from '../types/signing';
import { signingService } from '../services/signing';
import { agreementRepository } from '../repositories/agreement-repository';
import { eventRepository } from '../repositories/event-repository';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

router.post('/send', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = SignSendRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid sign send request',
        400,
        'INVALID_SIGN_REQUEST',
        validationResult.error.errors
      );
    }

    const { client_id, email, name, pdf_base64, subject, message } = validationResult.data;

    // Validate PDF base64 size (approximate check)
    const pdfSizeBytes = (pdf_base64.length * 3) / 4;
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (pdfSizeBytes > maxSizeBytes) {
      throw new AppError(
        'PDF file too large (max 25MB)',
        400,
        'PDF_TOO_LARGE'
      );
    }

    try {
      // Send agreement via chosen provider
      const result = await signingService.sendAgreement(
        email,
        name,
        pdf_base64,
        subject || 'Your Working Capital Agreement',
        message || 'Please review and sign.'
      );

      // Store agreement in database
      const agreement = await agreementRepository.createAgreement({
        client_id,
        provider: result.provider,
        envelope_id: result.envelope_id,
        status: 'sent'
      });

      // Record event
      await eventRepository.recordEvent({
        type: EventTypes.SIGN_SENT,
        client_id,
        data: {
          envelope_id: result.envelope_id,
          provider: result.provider,
          email,
          name,
          subject: subject || 'Your Working Capital Agreement'
        }
      });

      const response: ApiResponse<SignSendResponse> = {
        success: true,
        data: {
          envelope_id: result.envelope_id,
          provider: result.provider,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (providerError) {
      throw new AppError(
        'Sign provider error',
        502,
        'SIGN_PROVIDER_ERROR',
        providerError instanceof Error ? providerError.message : 'Unknown provider error'
      );
    }
  } catch (error) {
    next(error);
  }
});

router.post('/webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verify webhook signature
    const bodyBytes = Buffer.from(JSON.stringify(req.body));
    if (!signingService.verifyWebhook(req.headers as Record<string, string>, bodyBytes)) {
      throw new AppError(
        'Invalid webhook signature',
        401,
        'INVALID_WEBHOOK_SIGNATURE'
      );
    }

    // Validate webhook payload (flexible schema)
    const validationResult = SignWebhookRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid webhook payload',
        400,
        'INVALID_WEBHOOK_PAYLOAD',
        validationResult.error.errors
      );
    }

    // Normalize webhook data based on provider
    const normalizedData = signingService.normalizeWebhookData(req.body);
    
    if (!normalizedData.envelope_id || !normalizedData.status) {
      throw new AppError(
        'Missing required webhook data: envelope_id and status',
        400,
        'MISSING_WEBHOOK_DATA'
      );
    }

    // Update agreement status
    const completedAt = normalizedData.status === 'completed' ? new Date().toISOString() : undefined;
    const updatedAgreement = await agreementRepository.setAgreementStatus(
      normalizedData.envelope_id,
      normalizedData.status as any,
      completedAt
    );

    if (!updatedAgreement) {
      console.warn(`Webhook received for unknown envelope: ${normalizedData.envelope_id}`);
    } else {
      // Record event if we have client_id
      const clientId = normalizedData.client_id || updatedAgreement.client_id;
      if (clientId) {
        const eventType = `sign.${normalizedData.status}` as any;
        await eventRepository.recordEvent({
          type: eventType,
          client_id: clientId,
          data: {
            envelope_id: normalizedData.envelope_id,
            status: normalizedData.status,
            provider: updatedAgreement.provider,
            completed_at: completedAt,
            webhook_data: req.body
          }
        });
      }
    }

    const response: SignWebhookResponse = {
      ok: true,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Events polling endpoint
router.get('/events', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate query parameters
    const validationResult = EventsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid events query parameters',
        400,
        'INVALID_EVENTS_QUERY',
        validationResult.error.errors
      );
    }

    const { since, client_id, type, limit } = validationResult.data;

    // Fetch events from database
    const events = await eventRepository.findEvents({
      clientId: client_id,
      type,
      since,
      limit: limit || 100
    });

    const response: ApiResponse<EventsListResponse> = {
      success: true,
      data: {
        events: events.map(event => ({
          id: event.id,
          type: event.type,
          client_id: event.client_id,
          data: event.data,
          created_at: event.created_at,
        })),
        total: events.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Optional: Get agreement status by envelope ID (for debugging/admin)
router.get('/agreement/:envelopeId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { envelopeId } = req.params;
    
    const agreement = await agreementRepository.findByEnvelopeId(envelopeId);
    
    if (!agreement) {
      throw new AppError(
        'Agreement not found',
        404,
        'AGREEMENT_NOT_FOUND'
      );
    }

    const response: ApiResponse<{ agreement: typeof agreement }> = {
      success: true,
      data: { agreement },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;