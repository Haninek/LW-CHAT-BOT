import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Prometheus metrics
router.get('/', asyncHandler(async (req, res) => {
  // TODO: Implement Prometheus metrics
  res.set('Content-Type', 'text/plain');
  res.send('# Metrics endpoint not yet implemented\n');
}));

export { router as metricsRoutes };