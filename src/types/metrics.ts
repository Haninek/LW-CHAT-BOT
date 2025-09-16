import { z } from 'zod';

export const MonthMetricsSchema = z.object({
  statement_month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be in YYYY-MM format'),
  total_deposits: z.number().nonnegative('Total deposits must be non-negative'),
  avg_daily_balance: z.number(),
  ending_balance: z.number(),
  nsf_count: z.number().int().nonnegative('NSF count must be a non-negative integer'),
  days_negative: z.number().int().nonnegative('Days negative must be a non-negative integer'),
});

export const MetricsSchema = z.object({
  months: z.array(MonthMetricsSchema).optional(),
  avg_monthly_revenue: z.number().nonnegative('Average monthly revenue must be non-negative'),
  avg_daily_balance_3m: z.number(),
  total_nsf_3m: z.number().int().nonnegative('Total NSF 3m must be a non-negative integer'),
  total_days_negative_3m: z.number().int().nonnegative('Total days negative 3m must be a non-negative integer'),
});

export type MonthMetrics = z.infer<typeof MonthMetricsSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;