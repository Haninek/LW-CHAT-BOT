import { Router, Request, Response, NextFunction } from 'express';
import { 
  CherrySendRequestSchema, 
  CherrySendResponse,
  CherryWebhookRequestSchema,
  CherryWebhookResponse,
  OPT_OUT_KEYWORDS,
  HELP_KEYWORDS,
  HELP_MESSAGE
} from '../types/sms';
import { CherryClient } from '../services/cherry-client';
import { clientRepository } from '../repositories/client-repository';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

router.post('/send', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = CherrySendRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid SMS send request',
        400,
        'INVALID_SMS_REQUEST',
        validationResult.error.errors
      );
    }

    const { message, group_id, numbers } = validationResult.data;

    // Always append opt-out language for compliance
    let finalMessage = message.trim();
    if (!finalMessage.toUpperCase().includes('STOP TO OPT OUT')) {
      finalMessage = `${finalMessage}\nReply STOP to opt out.`;
    }

    const client = new CherryClient();
    let providerResponse: any;

    try {
      if (group_id) {
        providerResponse = await client.sendGroup(group_id, finalMessage);
      } else if (numbers) {
        // Normalize phone numbers
        const normalizedNumbers = numbers.map(num => CherryClient.normalizePhoneNumber(num));
        
        // Upsert all numbers for consent tracking
        for (const phone of normalizedNumbers) {
          await clientRepository.upsertClient(phone);
        }

        providerResponse = await client.sendNumbers(normalizedNumbers, finalMessage);
      }

      const response: ApiResponse<CherrySendResponse> = {
        success: true,
        data: {
          accepted: true,
          provider_response: providerResponse,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (providerError) {
      throw new AppError(
        'Cherry SMS service error',
        502,
        'CHERRY_SMS_ERROR',
        providerError instanceof Error ? providerError.message : 'Unknown provider error'
      );
    }
  } catch (error) {
    next(error);
  }
});

router.post('/webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate webhook payload
    const validationResult = CherryWebhookRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid webhook payload',
        400,
        'INVALID_WEBHOOK_PAYLOAD',
        validationResult.error.errors
      );
    }

    const { from, phone, message, text } = validationResult.data;
    
    // Extract sender and message
    const sender = (from || phone)!.trim();
    const inboundMessage = (message || text)!.trim();
    const upperMessage = inboundMessage.toUpperCase();

    // Normalize sender phone number
    const normalizedSender = CherryClient.normalizePhoneNumber(sender);

    // Check for opt-out keywords
    const isOptOut = Array.from(OPT_OUT_KEYWORDS).some(keyword => 
      upperMessage === keyword || upperMessage.startsWith(keyword + ' ')
    );

    if (isOptOut) {
      await clientRepository.setOptOut(normalizedSender);
      
      const response: CherryWebhookResponse = {
        status: 'ok',
        action: 'opted_out',
      };

      res.json(response);
      return;
    }

    // Check for help keywords
    const isHelp = Array.from(HELP_KEYWORDS).some(keyword => 
      upperMessage === keyword || upperMessage.startsWith(keyword + ' ')
    );

    if (isHelp) {
      const response: CherryWebhookResponse = {
        status: 'ok',
        action: 'help',
        message: HELP_MESSAGE,
      };

      res.json(response);
      return;
    }

    // For any other message, ensure client exists but don't change consent
    await clientRepository.upsertClient(normalizedSender);

    const response: CherryWebhookResponse = {
      status: 'ok',
      action: 'ignored',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Optional: Get client consent status (for debugging/admin)
router.get('/client/:phone', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.params;
    const normalizedPhone = CherryClient.normalizePhoneNumber(phone);
    
    const client = await clientRepository.findByPhone(normalizedPhone);
    
    if (!client) {
      throw new AppError(
        'Client not found',
        404,
        'CLIENT_NOT_FOUND'
      );
    }

    const response: ApiResponse<{ client: typeof client }> = {
      success: true,
      data: { client },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;