import { Router } from 'express';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

// Health check endpoint
router.get('/healthz', asyncHandler(async (req, res) => {
  res.json({ ok: true });
}));

// Readiness check endpoint
router.get('/readyz', asyncHandler(async (req, res) => {
  // TODO: Add dependency checks (database, Redis, external APIs)
  res.json({ ready: true });
}));

export { router as healthRoutes };