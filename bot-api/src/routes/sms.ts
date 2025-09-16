import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Send SMS via Cherry
router.post('/send', asyncHandler(async (req, res) => {
  // TODO: Implement Cherry SMS sending
  res.status(501).json({
    error: 'Not Implemented',
    message: 'SMS sending endpoint not yet implemented',
  });
}));

// Cherry SMS webhook
router.post('/webhook', asyncHandler(async (req, res) => {
  // TODO: Implement Cherry SMS webhook handling
  res.status(501).json({
    error: 'Not Implemented',
    message: 'SMS webhook endpoint not yet implemented',
  });
}));

export { router as smsRoutes };