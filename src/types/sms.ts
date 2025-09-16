import { z } from 'zod';

// Phone number validation schema
const phoneNumberSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must not exceed 15 digits')
  .regex(/^[\+]?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const CherrySendRequestSchema = z.object({
  message: z.string()
    .min(3, 'Message must be at least 3 characters')
    .max(480, 'Message must not exceed 480 characters'),
  group_id: z.string().optional(),
  numbers: z.array(phoneNumberSchema).optional(),
}).refine(
  (data) => data.group_id || (data.numbers && data.numbers.length > 0),
  {
    message: 'Either group_id or numbers array must be provided',
    path: ['group_id'],
  }
);

export const CherrySendResponseSchema = z.object({
  accepted: z.boolean(),
  provider_response: z.record(z.unknown()),
});

// Webhook schemas
export const CherryWebhookRequestSchema = z.object({
  from: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  text: z.string().optional(),
  timestamp: z.string().optional(),
  message_id: z.string().optional(),
}).refine(
  (data) => data.from || data.phone,
  {
    message: 'Either from or phone field must be provided',
    path: ['from'],
  }
).refine(
  (data) => data.message || data.text,
  {
    message: 'Either message or text field must be provided',
    path: ['message'],
  }
);

export const CherryWebhookResponseSchema = z.object({
  status: z.literal('ok'),
  action: z.enum(['opted_out', 'help', 'ignored']),
  message: z.string().optional(),
});

export type CherrySendRequest = z.infer<typeof CherrySendRequestSchema>;
export type CherrySendResponse = z.infer<typeof CherrySendResponseSchema>;
export type CherryWebhookRequest = z.infer<typeof CherryWebhookRequestSchema>;
export type CherryWebhookResponse = z.infer<typeof CherryWebhookResponseSchema>;

// Constants for keyword matching
export const OPT_OUT_KEYWORDS = new Set([
  'STOP',
  'STOPALL', 
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT'
]);

export const HELP_KEYWORDS = new Set([
  'HELP'
]);

export const HELP_MESSAGE = 'LendWisely Alerts: Msg&data rates may apply. Reply STOP to opt out.';