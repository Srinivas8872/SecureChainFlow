import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    requestId?: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
    requestId?: string;
    details?: any;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Omit<ApiResponse['meta'], 'timestamp'>
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString()
    }
  });
}
