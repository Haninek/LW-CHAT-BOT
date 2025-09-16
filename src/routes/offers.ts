import { Router, Request, Response, NextFunction } from 'express';
import { MetricsSchema, Metrics } from '../types/metrics';
import { Offer, OffersResponseSchema } from '../types/offers';
import { proposeOffers } from '../services/offers-engine';
import { openaiService } from '../services/openai';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

router.post('/offers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = MetricsSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid metrics data',
        400,
        'INVALID_METRICS',
        validationResult.error.errors
      );
    }

    const metrics: Metrics = validationResult.data;

    // Generate deterministic offers
    const baseOffers = proposeOffers(metrics);
    
    if (baseOffers.length === 0) {
      throw new AppError(
        'No feasible offers under current guardrails. This may be due to high NSF count (>3) or too many negative balance days (>6).',
        422,
        'NO_FEASIBLE_OFFERS'
      );
    }

    // Generate AI rationales for each offer
    const rationales = await openaiService.explainOffers(metrics, baseOffers);

    // Combine offers with rationales
    const offers: Offer[] = baseOffers.map((offer, index) => ({
      ...offer,
      rationale: rationales[index] || '• Competitive terms\n• Flexible repayment\n• Quick funding',
    }));

    const response: ApiResponse<{ offers: Offer[] }> = {
      success: true,
      data: { offers },
      timestamp: new Date().toISOString(),
    };

    // Validate response
    const responseValidation = OffersResponseSchema.safeParse({ offers });
    if (!responseValidation.success) {
      throw new AppError(
        'Internal error: invalid offers response format',
        500,
        'INVALID_OFFERS_RESPONSE',
        responseValidation.error.errors
      );
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;