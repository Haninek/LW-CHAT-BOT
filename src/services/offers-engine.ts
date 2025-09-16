import { Metrics } from '../types/metrics';
import { OfferBase } from '../types/offers';

interface Tier {
  factor: number;
  fee: number;
  term_days: number;
}

const TIERS: Tier[] = [
  { factor: 0.6, fee: 1.25, term_days: 120 },
  { factor: 0.8, fee: 1.30, term_days: 140 },
  { factor: 1.0, fee: 1.35, term_days: 160 },
];

function roundTo100(x: number): number {
  return Math.round(x / 100) * 100;
}

export function proposeOffers(metrics: Metrics): OfferBase[] {
  // Guardrails: reject if too many NSFs or negative days
  if (metrics.total_nsf_3m > 3 || metrics.total_days_negative_3m > 6) {
    return [];
  }

  // Calculate base amount using the smaller of two calculations
  const base = Math.min(
    metrics.avg_monthly_revenue * 1.2,
    metrics.avg_daily_balance_3m * 20
  );

  const offers: OfferBase[] = [];

  for (const tier of TIERS) {
    const amount = roundTo100(base * tier.factor);
    const payback = amount * tier.fee;

    // Cap: payback should not exceed 25% of monthly revenue
    if (metrics.avg_monthly_revenue > 0 && (payback / metrics.avg_monthly_revenue) > 0.25) {
      continue;
    }

    const est_daily = Math.round((payback / tier.term_days) * 100) / 100;

    offers.push({
      amount: parseFloat(amount.toFixed(2)),
      fee: parseFloat(tier.fee.toFixed(2)),
      term_days: tier.term_days,
      payback: parseFloat(payback.toFixed(2)),
      est_daily: parseFloat(est_daily.toFixed(2)),
    });
  }

  // Return up to 3 offers
  return offers.slice(0, 3);
}