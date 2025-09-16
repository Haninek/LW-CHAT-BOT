import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Get events
router.get('/', asyncHandler(async (req, res) => {
  // TODO: Implement events retrieval
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Events endpoint not yet implemented',
  });
}));

export { router as eventRoutes };