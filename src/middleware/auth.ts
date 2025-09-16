import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/global';

export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.API_KEY_PARTNER;

  if (!expectedApiKey) {
    const error: ApiError = {
      message: 'API authentication not configured',
      code: 'AUTH_NOT_CONFIGURED',
      statusCode: 500,
    };
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!apiKey) {
    const error: ApiError = {
      message: 'API key required',
      code: 'API_KEY_MISSING',
      statusCode: 401,
    };
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (apiKey !== expectedApiKey) {
    const error: ApiError = {
      message: 'Invalid API key',
      code: 'API_KEY_INVALID',
      statusCode: 401,
    };
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Set user context if needed
  req.user = {
    id: 'api-client',
    email: 'api@lendwizely.com',
  };

  next();
};