import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Parse bank statements
router.post('/parse', asyncHandler(async (req, res) => {
  // TODO: Implement PDF parsing with OpenAI
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Bank parsing endpoint not yet implemented',
  });
}));

export { router as bankRoutes };