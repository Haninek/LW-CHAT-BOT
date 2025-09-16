import { Router, Request, Response, NextFunction } from 'express';
import { MetricsSchema, Metrics } from '../types/metrics';
import { proposeOffers } from '../services/offers-engine';
import { openaiService } from '../services/openai';
import { 
  OffersRequestSchema, 
  OfferOverrides,
  EnhancedOffer
} from '../types/offers-overrides';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

router.post('/offers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate the entire request including overrides
    const validationResult = OffersRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid offers request',
        400,
        'INVALID_OFFERS_REQUEST',
        validationResult.error.errors
      );
    }

    const { overrides, ...metricsData } = validationResult.data;

    // Create metrics object (without overrides)
    const metrics: Metrics = {
      avg_monthly_revenue: metricsData.avg_monthly_revenue,
      avg_daily_balance_3m: metricsData.avg_daily_balance_3m,
      total_nsf_3m: metricsData.total_nsf_3m,
      total_days_negative_3m: metricsData.total_days_negative_3m,
      months: metricsData.months,
    };

    // Generate offers using overrides
    const baseOffers = proposeOffers(metrics, overrides);
    
    if (baseOffers.length === 0) {
      // Return empty offers array for frontend compatibility
      res.json({ offers: [] });
      return;
    }

    // Generate AI rationales for each offer (if OpenAI is available)
    let offersWithRationales: EnhancedOffer[] = baseOffers;
    
    try {
      // Convert enhanced offers to format expected by OpenAI service
      const offersForAI = baseOffers.map(offer => ({
        amount: offer.amount,
        fee: offer.fee,
        term_days: offer.term_days,
        payback: offer.payback,
        est_daily: offer.est_daily,
      }));

      const rationales = await openaiService.explainOffers(metrics, offersForAI);

      // Combine offers with rationales
      offersWithRationales = baseOffers.map((offer, index) => ({
        ...offer,
        rationale: rationales[index] || '• Competitive terms\n• Flexible repayment\n• Quick funding',
      }));
    } catch (aiError) {
      // If AI rationale generation fails, continue with offers but log the error
      console.warn('AI rationale generation failed:', aiError);
      
      // Add default rationales
      offersWithRationales = baseOffers.map(offer => ({
        ...offer,
        rationale: '• Competitive terms\n• Flexible repayment\n• Quick funding',
      }));
    }

    // Log overrides usage (for debugging)
    if (overrides) {
      console.log('Offers generated with custom overrides:', {
        tiers: overrides.tiers?.length || 0,
        caps: !!overrides.caps,
        thresholds: !!overrides.thresholds,
      });
    }

    // Return in format expected by frontend (direct offers array)
    res.json({ offers: offersWithRationales });
  } catch (error) {
    next(error);
  }
});

export default router;