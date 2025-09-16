import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Generate offers
router.post('/', asyncHandler(async (req, res) => {
  // TODO: Implement offer generation logic
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Offers endpoint not yet implemented',
  });
}));

export { router as offerRoutes };