import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/global';

const router = Router();

router.get('/healthz', (req: Request, res: Response): void => {
  const response: ApiResponse<{ status: string; uptime: number; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

router.get('/readyz', (req: Request, res: Response): void => {
  // In a real app, you'd check database connections, external services, etc.
  const checks = {
    environment: !!process.env.NODE_ENV,
    apiKey: !!process.env.API_KEY_PARTNER,
    openai: !!process.env.OPENAI_API_KEY,
    plaid: !!process.env.PLAID_CLIENT_ID && !!process.env.PLAID_SECRET,
  };

  const allReady = Object.values(checks).every(Boolean);

  const response: ApiResponse<{ ready: boolean; checks: typeof checks }> = {
    success: true,
    data: {
      ready: allReady,
      checks,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(allReady ? 200 : 503).json(response);
});

export default router;