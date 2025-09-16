import { Metrics } from '../types/metrics';
import { 
  OfferOverrides, 
  TierOverride, 
  CapsOverride, 
  ThresholdsOverride,
  DEFAULT_TIERS,
  DEFAULT_CAPS,
  DEFAULT_THRESHOLDS,
  EnhancedOffer
} from '../types/offers-overrides';

function roundTo100(x: number): number {
  return Math.round(x / 100) * 100;
}

function resolveRules(overrides?: OfferOverrides): {
  tiers: TierOverride[];
  caps: CapsOverride;
  thresholds: ThresholdsOverride;
} {
  return {
    tiers: overrides?.tiers && overrides.tiers.length > 0 ? overrides.tiers : DEFAULT_TIERS,
    caps: overrides?.caps || DEFAULT_CAPS,
    thresholds: overrides?.thresholds || DEFAULT_THRESHOLDS,
  };
}

export function proposeOffers(metrics: Metrics, overrides?: OfferOverrides): EnhancedOffer[] {
  const { tiers, caps, thresholds } = resolveRules(overrides);

  // Guardrails: reject if too many NSFs or negative days (using override thresholds)
  if (metrics.total_nsf_3m > thresholds.max_nsf_3m || 
      metrics.total_days_negative_3m > thresholds.max_negative_days_3m) {
    return [];
  }

  // Calculate base amount using the smaller of two calculations
  const base = Math.min(
    metrics.avg_monthly_revenue * 1.2,
    metrics.avg_daily_balance_3m * 20
  );

  const offers: EnhancedOffer[] = [];

  for (const tier of tiers) {
    const amount = roundTo100(base * tier.factor);
    const payback = amount * tier.fee;

    // Cap: payback should not exceed configured percentage of monthly revenue
    if (metrics.avg_monthly_revenue > 0 && 
        (payback / metrics.avg_monthly_revenue) > caps.payback_to_monthly_rev) {
      continue;
    }

    const est_daily = Math.round((payback / tier.term_days) * 100) / 100;

    const offer: EnhancedOffer = {
      amount: parseFloat(amount.toFixed(2)),
      fee: parseFloat(tier.fee.toFixed(2)),
      term_days: tier.term_days,
      payback: parseFloat(payback.toFixed(2)),
      est_daily: parseFloat(est_daily.toFixed(2)),
    };

    // Add buy rate and margin calculation if buy_rate is provided
    if (tier.buy_rate !== undefined && tier.buy_rate > 0) {
      try {
        const marginRate = Math.max(0.0, tier.fee - tier.buy_rate);
        offer.buy_rate = parseFloat(tier.buy_rate.toFixed(2));
        offer.expected_margin = parseFloat((amount * marginRate).toFixed(2));
      } catch (error) {
        // If buy rate calculation fails, just skip the buy rate fields
        console.warn('Buy rate calculation failed for tier:', tier, error);
      }
    }

    offers.push(offer);
  }

  // Return up to 3 offers
  return offers.slice(0, 3);
}