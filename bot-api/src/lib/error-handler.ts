import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';
import { config } from './config.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational !== false;

  // Log error
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode,
      isOperational,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id,
    },
  });

  // Don't leak error details in production
  const message = config.server.nodeEnv === 'production' && !isOperational
    ? 'Internal server error'
    : error.message;

  const response: any = {
    error: getErrorName(statusCode),
    message,
    requestId: req.id,
  };

  // Add stack trace in development
  if (config.server.nodeEnv === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

function getErrorName(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};