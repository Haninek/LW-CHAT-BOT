import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Client intake
router.post('/', asyncHandler(async (req, res) => {
  // TODO: Implement client intake processing
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Intake endpoint not yet implemented',
  });
}));

export { router as intakeRoutes };