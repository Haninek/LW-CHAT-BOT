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
    // Extract metrics and optional overrides from request
    const { overrides, ...metricsData } = req.body;

    // Validate metrics data
    const validationResult = MetricsSchema.safeParse(metricsData);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid metrics data',
        400,
        'INVALID_METRICS',
        validationResult.error.errors
      );
    }

    const metrics: Metrics = validationResult.data;

    // Generate deterministic offers (overrides could be used here in future)
    const baseOffers = proposeOffers(metrics);
    
    if (baseOffers.length === 0) {
      // Return empty offers array for frontend compatibility
      res.json({ offers: [] });
      return;
    }

    // Generate AI rationales for each offer
    const rationales = await openaiService.explainOffers(metrics, baseOffers);

    // Combine offers with rationales
    const offers: Offer[] = baseOffers.map((offer, index) => ({
      ...offer,
      rationale: rationales[index] || '• Competitive terms\n• Flexible repayment\n• Quick funding',
    }));

    // Return in format expected by frontend (direct offers array)
    res.json({ offers });
  } catch (error) {
    next(error);
  }
});

export default router;