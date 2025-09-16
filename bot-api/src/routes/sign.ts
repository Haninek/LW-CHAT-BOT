import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Send document for signing
router.post('/send', asyncHandler(async (req, res) => {
  // TODO: Implement document signing
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Document signing endpoint not yet implemented',
  });
}));

// Signing webhook
router.post('/webhook', asyncHandler(async (req, res) => {
  // TODO: Implement signing webhook handling
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Signing webhook endpoint not yet implemented',
  });
}));

export { router as signRoutes };