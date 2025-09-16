import { z } from 'zod';

// Base64 PDF validation
const base64PdfSchema = z.string()
  .min(100, 'PDF base64 string too short')
  .regex(/^[A-Za-z0-9+/]+=*$/, 'Invalid base64 format');

export const SignSendRequestSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  email: z.string().email('Valid email address is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  pdf_base64: base64PdfSchema,
  subject: z.string().max(200, 'Subject too long').optional(),
  message: z.string().max(1000, 'Message too long').optional(),
});

export const SignSendResponseSchema = z.object({
  envelope_id: z.string(),
  provider: z.enum(['docusign', 'dropboxsign']),
});

export const SignWebhookRequestSchema = z.object({
  // Generic webhook schema - will be normalized by service
  envelope_id: z.string().optional(),
  envelopeId: z.string().optional(),
  request_id: z.string().optional(),
  signature_request_id: z.string().optional(),
  status: z.string().optional(),
  event_type: z.string().optional(),
  client_id: z.string().optional(),
  completed_at: z.string().optional(),
}).passthrough(); // Allow additional fields from providers

export const SignWebhookResponseSchema = z.object({
  ok: z.boolean(),
});

export const EventsQuerySchema = z.object({
  since: z.string().datetime().optional(),
  client_id: z.string().optional(),
  type: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const EventResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  client_id: z.string(),
  data: z.string(), // JSON string
  created_at: z.string(),
});

export const EventsListResponseSchema = z.object({
  events: z.array(EventResponseSchema),
  total: z.number().optional(),
});

export type SignSendRequest = z.infer<typeof SignSendRequestSchema>;
export type SignSendResponse = z.infer<typeof SignSendResponseSchema>;
export type SignWebhookRequest = z.infer<typeof SignWebhookRequestSchema>;
export type SignWebhookResponse = z.infer<typeof SignWebhookResponseSchema>;
export type EventsQuery = z.infer<typeof EventsQuerySchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;
export type EventsListResponse = z.infer<typeof EventsListResponseSchema>;

// Agreement status enum
export const AgreementStatus = z.enum(['sent', 'completed', 'declined', 'error']);
export type AgreementStatus = z.infer<typeof AgreementStatus>;

// Event types
export const EventTypes = {
  SIGN_COMPLETED: 'sign.completed',
  SIGN_DECLINED: 'sign.declined',
  SIGN_SENT: 'sign.sent',
  SIGN_ERROR: 'sign.error',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];