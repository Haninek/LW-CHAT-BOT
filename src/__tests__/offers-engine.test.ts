import { proposeOffers } from '../services/offers-engine';
import { Metrics } from '../types/metrics';

describe('Offers Engine', () => {
  const baseMetrics: Metrics = {
    avg_monthly_revenue: 80000,
    avg_daily_balance_3m: 12000,
    total_nsf_3m: 1,
    total_days_negative_3m: 2,
  };

  describe('proposeOffers', () => {
    it('should return 3 offers for strong metrics', () => {
      const offers = proposeOffers(baseMetrics);
      
      expect(offers).toHaveLength(3);
      
      // Verify offer structure
      offers.forEach(offer => {
        expect(offer).toHaveProperty('amount');
        expect(offer).toHaveProperty('fee');
        expect(offer).toHaveProperty('term_days');
        expect(offer).toHaveProperty('payback');
        expect(offer).toHaveProperty('est_daily');
        expect(typeof offer.amount).toBe('number');
        expect(typeof offer.fee).toBe('number');
        expect(typeof offer.term_days).toBe('number');
        expect(typeof offer.payback).toBe('number');
        expect(typeof offer.est_daily).toBe('number');
      });

      // Verify amounts are rounded to nearest $100
      offers.forEach(offer => {
        expect(offer.amount % 100).toBe(0);
      });

      // Verify payback calculation
      offers.forEach(offer => {
        expect(offer.payback).toBeCloseTo(offer.amount * offer.fee, 2);
      });

      // Verify daily estimation
      offers.forEach(offer => {
        expect(offer.est_daily).toBeCloseTo(offer.payback / offer.term_days, 2);
      });
    });

    it('should reject when NSF count exceeds limit', () => {
      const metricsWithHighNSF: Metrics = {
        ...baseMetrics,
        total_nsf_3m: 4, // Above limit of 3
      };

      const offers = proposeOffers(metricsWithHighNSF);
      expect(offers).toHaveLength(0);
    });

    it('should reject when negative days exceed limit', () => {
      const metricsWithHighNegativeDays: Metrics = {
        ...baseMetrics,
        total_days_negative_3m: 7, // Above limit of 6
      };

      const offers = proposeOffers(metricsWithHighNegativeDays);
      expect(offers).toHaveLength(0);
    });

    it('should cap offers when payback exceeds 25% of monthly revenue', () => {
      const lowRevenueMetrics: Metrics = {
        ...baseMetrics,
        avg_monthly_revenue: 5000, // Very low revenue
        avg_daily_balance_3m: 50000, // High balance
      };

      const offers = proposeOffers(lowRevenueMetrics);
      
      // Should have fewer offers due to capping
      offers.forEach(offer => {
        const paybackRatio = offer.payback / lowRevenueMetrics.avg_monthly_revenue;
        expect(paybackRatio).toBeLessThanOrEqual(0.25);
      });
    });

    it('should use the minimum of the two base calculations', () => {
      const metricsWithHighRevenue: Metrics = {
        ...baseMetrics,
        avg_monthly_revenue: 100000, // High revenue: 100k * 1.2 = 120k
        avg_daily_balance_3m: 1000,  // Low balance: 1k * 20 = 20k (should be used)
      };

      const offers = proposeOffers(metricsWithHighRevenue);
      
      if (offers.length > 0) {
        // The highest offer should be based on balance * 20, not revenue * 1.2
        const expectedBase = 1000 * 20; // 20k
        const highestOffer = Math.max(...offers.map(o => o.amount));
        expect(highestOffer).toBeLessThanOrEqual(expectedBase + 100); // Allow for rounding
      }
    });

    it('should round amounts to nearest $100', () => {
      const offers = proposeOffers(baseMetrics);
      
      offers.forEach(offer => {
        expect(offer.amount % 100).toBe(0);
        expect(offer.amount).toBeGreaterThan(0);
      });
    });

    it('should handle zero revenue gracefully', () => {
      const zeroRevenueMetrics: Metrics = {
        ...baseMetrics,
        avg_monthly_revenue: 0,
      };

      // Should not throw error, but may return empty array or filtered offers
      expect(() => proposeOffers(zeroRevenueMetrics)).not.toThrow();
    });

    it('should return offers in ascending order of amount', () => {
      const offers = proposeOffers(baseMetrics);
      
      if (offers.length > 1) {
        for (let i = 1; i < offers.length; i++) {
          expect(offers[i]!.amount).toBeGreaterThan(offers[i - 1]!.amount);
        }
      }
    });

    it('should use correct tier configurations', () => {
      const offers = proposeOffers(baseMetrics);
      
      const expectedFees = [1.25, 1.30, 1.35];
      const expectedTerms = [120, 140, 160];
      
      offers.forEach((offer, index) => {
        expect(offer.fee).toBe(expectedFees[index]);
        expect(offer.term_days).toBe(expectedTerms[index]);
      });
    });
  });
});