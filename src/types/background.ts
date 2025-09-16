import { z } from 'zod';

// Decision types
export const DecisionSchema = z.enum(['OK', 'Review', 'Decline']);
export type Decision = z.infer<typeof DecisionSchema>;

// Person schema with PII handling
export const PersonSchema = z.object({
  first: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'),
  ssn4: z.string().length(4, 'SSN4 must be exactly 4 digits').regex(/^\d{4}$/, 'SSN4 must contain only digits').optional(),
  email: z.string().email('Valid email required').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  address: z.string().max(200, 'Address too long').optional(),
});

export const BackgroundFlagsSchema = z.object({
  decision: DecisionSchema,
  notes: z.array(z.string()),
  raw: z.record(z.unknown()).optional(),
});

export const BackgroundCheckRequestSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  person: PersonSchema,
});

export const BackgroundCheckAcceptedSchema = z.object({
  job_id: z.string(),
});

export const BackgroundJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);

export const BackgroundJobStateSchema = z.object({
  job_id: z.string(),
  status: BackgroundJobStatusSchema,
  result: BackgroundFlagsSchema.optional(),
  error: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Webhook payload schema
export const BackgroundWebhookPayloadSchema = z.object({
  type: z.literal('background.completed'),
  client_id: z.string(),
  job_id: z.string(),
  flags: BackgroundFlagsSchema,
});

export type Person = z.infer<typeof PersonSchema>;
export type BackgroundFlags = z.infer<typeof BackgroundFlagsSchema>;
export type BackgroundCheckRequest = z.infer<typeof BackgroundCheckRequestSchema>;
export type BackgroundCheckAccepted = z.infer<typeof BackgroundCheckAcceptedSchema>;
export type BackgroundJobStatus = z.infer<typeof BackgroundJobStatusSchema>;
export type BackgroundJobState = z.infer<typeof BackgroundJobStateSchema>;
export type BackgroundWebhookPayload = z.infer<typeof BackgroundWebhookPayloadSchema>;

// Event types
export const BackgroundEventTypes = {
  BACKGROUND_COMPLETED: 'background.completed',
  BACKGROUND_STARTED: 'background.started',
  BACKGROUND_FAILED: 'background.failed',
} as const;

export type BackgroundEventType = typeof BackgroundEventTypes[keyof typeof BackgroundEventTypes];