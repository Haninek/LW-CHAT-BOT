import { z } from 'zod';

export const OfferSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  fee: z.number().positive('Fee must be positive'),
  term_days: z.number().int().positive('Term days must be a positive integer'),
  payback: z.number().positive('Payback must be positive'),
  est_daily: z.number().positive('Estimated daily must be positive'),
  rationale: z.string().min(1, 'Rationale is required'),
});

export const OffersResponseSchema = z.object({
  offers: z.array(OfferSchema),
});

export type Offer = z.infer<typeof OfferSchema>;
export type OffersResponse = z.infer<typeof OffersResponseSchema>;

// Internal type for offers before rationales are added
export const OfferBaseSchema = z.object({
  amount: z.number().positive(),
  fee: z.number().positive(),
  term_days: z.number().int().positive(),
  payback: z.number().positive(),
  est_daily: z.number().positive(),
});

export type OfferBase = z.infer<typeof OfferBaseSchema>;