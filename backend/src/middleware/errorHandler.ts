import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || 'req-' + Date.now();
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred.';
  let details: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for the submitted payload.';
    details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = err.message || 'Invalid or expired authorization token.';
  } else if (err.code === 11000) {
    // Mongo duplicate key error
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A resource with duplicate unique field(s) already exists.';
    details = err.keyValue;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'Invalid format for resource identifier.';
  }

  logger.error(`API Error [${code}] at ${req.method} ${req.originalUrl}: ${message}`, {
    requestId,
    statusCode,
    details,
    stack: statusCode === 500 ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {})
    }
  });
}
