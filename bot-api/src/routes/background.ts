import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Initiate background check
router.post('/check', asyncHandler(async (req, res) => {
  // TODO: Implement background check initiation
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Background check endpoint not yet implemented',
  });
}));

// Get background check status
router.get('/check/:check_id', asyncHandler(async (req, res) => {
  // TODO: Implement background check status retrieval
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Background check status endpoint not yet implemented',
  });
}));

export { router as backgroundRoutes };