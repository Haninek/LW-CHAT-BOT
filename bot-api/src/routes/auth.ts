import { Router } from 'express';
import { z } from 'zod';
import { generateToken } from '../lib/auth.js';
import { asyncHandler } from '../lib/error-handler.js';

const router = Router();

const tokenRequestSchema = z.object({
  api_key: z.string().min(1, 'API key is required'),
});

// Generate JWT token
router.post('/token', asyncHandler(async (req, res) => {
  const { api_key } = tokenRequestSchema.parse(req.body);
  
  const { token, expiresIn } = generateToken(api_key);
  
  res.json({
    token,
    expires_in: expiresIn,
  });
}));

export { router as authRoutes };