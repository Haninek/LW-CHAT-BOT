import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/global';

// In-memory store for demo - use Redis in production
const idempotencyStore = new Map<string, {
  response: unknown;
  timestamp: number;
}>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > oneHour) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export const handleIdempotency = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    next();
    return;
  }

  // Validate idempotency key format (UUID-like)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    const error: ApiError = {
      message: 'Invalid idempotency key format. Must be a valid UUID.',
      code: 'INVALID_IDEMPOTENCY_KEY',
      statusCode: 400,
    };
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const stored = idempotencyStore.get(idempotencyKey);
  if (stored) {
    // Return cached response
    res.json(stored.response);
    return;
  }

  // Store the key for this request
  req.idempotencyKey = idempotencyKey;

  // Override res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = function(body: unknown) {
    if (req.idempotencyKey && res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(req.idempotencyKey, {
        response: body,
        timestamp: Date.now(),
      });
    }
    return originalJson(body);
  };

  next();
};