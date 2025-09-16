import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { logger } from './logger.js';
import { CustomError } from './error-handler.js';

export interface JWTPayload {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
}

export const generateToken = (apiKey: string): { token: string; expiresIn: number } => {
  if (apiKey !== config.apiKeys.partner) {
    throw new CustomError('Invalid API key', 401);
  }

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: 'partner',
    iss: config.jwt.issuer,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: `${config.jwt.ttlMinutes}m`,
  });

  return {
    token,
    expiresIn: config.jwt.ttlMinutes * 60,
  };
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    if (payload.iss !== config.jwt.issuer) {
      throw new CustomError('Invalid token issuer', 401);
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new CustomError('Invalid token', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new CustomError('Token expired', 401);
    }
    throw error;
  }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Add user info to request
    req.user = {
      id: payload.sub,
      type: 'partner',
    };

    logger.debug('User authenticated', {
      requestId: req.id,
      userId: payload.sub,
      issuer: payload.iss,
    });

    next();
  } catch (error) {
    next(error);
  }
};

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        type: string;
      };
    }
  }
}