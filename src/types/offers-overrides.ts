import { z } from 'zod';

// Tier override schema with buy rate support
export const TierOverrideSchema = z.object({
  factor: z.number().positive('Factor must be positive'),
  fee: z.number().positive('Fee must be positive'),
  term_days: z.number().int().positive('Term days must be a positive integer'),
  buy_rate: z.number().positive('Buy rate must be positive').optional(),
});

// Caps override schema
export const CapsOverrideSchema = z.object({
  payback_to_monthly_rev: z.number().positive('Payback to monthly revenue ratio must be positive').default(0.25),
});

// Thresholds override schema
export const ThresholdsOverrideSchema = z.object({
  max_nsf_3m: z.number().int().nonnegative('Max NSF 3m must be non-negative').default(3),
  max_negative_days_3m: z.number().int().nonnegative('Max negative days 3m must be non-negative').default(6),
});

// Main overrides schema
export const OfferOverridesSchema = z.object({
  tiers: z.array(TierOverrideSchema).optional(),
  caps: CapsOverrideSchema.optional(),
  thresholds: ThresholdsOverrideSchema.optional(),
});

// Enhanced metrics request schema that includes overrides
export const OffersRequestSchema = z.object({
  // Base metrics fields
  avg_monthly_revenue: z.number().nonnegative('Average monthly revenue must be non-negative'),
  avg_daily_balance_3m: z.number(),
  total_nsf_3m: z.number().int().nonnegative('Total NSF 3m must be a non-negative integer'),
  total_days_negative_3m: z.number().int().nonnegative('Total days negative 3m must be a non-negative integer'),
  
  // Optional month-by-month breakdown
  months: z.array(z.object({
    statement_month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be in YYYY-MM format'),
    total_deposits: z.number().nonnegative('Total deposits must be non-negative'),
    avg_daily_balance: z.number(),
    ending_balance: z.number(),
    nsf_count: z.number().int().nonnegative('NSF count must be a non-negative integer'),
    days_negative: z.number().int().nonnegative('Days negative must be a non-negative integer'),
  })).optional(),
  
  // Overrides
  overrides: OfferOverridesSchema.optional(),
});

// Type exports
export type TierOverride = z.infer<typeof TierOverrideSchema>;
export type CapsOverride = z.infer<typeof CapsOverrideSchema>;
export type ThresholdsOverride = z.infer<typeof ThresholdsOverrideSchema>;
export type OfferOverrides = z.infer<typeof OfferOverridesSchema>;
export type OffersRequest = z.infer<typeof OffersRequestSchema>;

// Default values
export const DEFAULT_TIERS: TierOverride[] = [
  { factor: 0.6, fee: 1.25, term_days: 120 },
  { factor: 0.8, fee: 1.30, term_days: 140 },
  { factor: 1.0, fee: 1.35, term_days: 160 },
];

export const DEFAULT_CAPS: CapsOverride = {
  payback_to_monthly_rev: 0.25,
};

export const DEFAULT_THRESHOLDS: ThresholdsOverride = {
  max_nsf_3m: 3,
  max_negative_days_3m: 6,
};

// Enhanced offer type with buy rate and margin
export const EnhancedOfferSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  fee: z.number().positive('Fee must be positive'),
  term_days: z.number().int().positive('Term days must be a positive integer'),
  payback: z.number().positive('Payback must be positive'),
  est_daily: z.number().positive('Estimated daily must be positive'),
  buy_rate: z.number().positive('Buy rate must be positive').optional(),
  expected_margin: z.number().nonnegative('Expected margin must be non-negative').optional(),
  rationale: z.string().min(1, 'Rationale is required').optional(),
});

export type EnhancedOffer = z.infer<typeof EnhancedOfferSchema>;