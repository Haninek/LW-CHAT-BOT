import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Create Plaid link token
router.post('/link-token', asyncHandler(async (req, res) => {
  // TODO: Implement Plaid link token creation
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Plaid link token endpoint not yet implemented',
  });
}));

// Exchange public token
router.post('/exchange', asyncHandler(async (req, res) => {
  // TODO: Implement Plaid token exchange
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Plaid token exchange endpoint not yet implemented',
  });
}));

// Get transactions
router.get('/transactions', asyncHandler(async (req, res) => {
  // TODO: Implement Plaid transactions retrieval
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Plaid transactions endpoint not yet implemented',
  });
}));

// List statements
router.get('/statements', asyncHandler(async (req, res) => {
  // TODO: Implement Plaid statements listing
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Plaid statements endpoint not yet implemented',
  });
}));

// Download statement
router.get('/statements/:statement_id/download', asyncHandler(async (req, res) => {
  // TODO: Implement Plaid statement download
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Plaid statement download endpoint not yet implemented',
  });
}));

export { router as plaidRoutes };