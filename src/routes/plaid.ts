import { Router, Request, Response, NextFunction } from 'express';
import { plaidService } from '../services/plaid';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

router.post('/link-token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Generate a user ID (in production, this would come from authentication)
    const userId = req.body.user_id || `user_${Date.now()}`;

    const linkTokenResponse = await plaidService.createLinkToken(userId);

    // Return in format expected by frontend
    res.json({
      link_token: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration,
      request_id: linkTokenResponse.request_id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/exchange', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { public_token } = req.body;

    if (!public_token) {
      throw new AppError(
        'public_token is required',
        400,
        'MISSING_PUBLIC_TOKEN'
      );
    }

    const exchangeResponse = await plaidService.exchangePublicToken(public_token);

    const response: ApiResponse<typeof exchangeResponse> = {
      success: true,
      data: exchangeResponse,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/transactions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { access_token, start_date, end_date } = req.body;

    if (!access_token || !start_date || !end_date) {
      throw new AppError(
        'access_token, start_date, and end_date are required',
        400,
        'MISSING_REQUIRED_FIELDS'
      );
    }

    const transactions = await plaidService.getTransactions(access_token, start_date, end_date);

    const response: ApiResponse<typeof transactions> = {
      success: true,
      data: transactions,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;