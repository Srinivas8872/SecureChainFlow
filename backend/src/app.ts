import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, AppError } from './middleware/errorHandler';
import { standardLimiter } from './middleware/rateLimiter';
import healthRoutes from './modules/health/healthRoutes';
import authRoutes from './modules/auth/authRoutes';
import productRoutes from './modules/products/productRoutes';
import batchRoutes from './modules/batches/batchRoutes';
import verifyRoutes from './modules/verify/verifyRoutes';
import analyticsRoutes from './modules/analytics/analyticsRoutes';

const app: Application = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? [env.FRONTEND_ORIGIN] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', env.FRONTEND_ORIGIN],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

// Body parsers with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracing and logging
app.use(requestLogger);

// Global standard rate limit
app.use('/api/', standardLimiter);

// Primary API v1 Router
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/verify', verifyRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Root informational endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'SecureChainFlow REST API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    healthCheck: '/api/v1/health'
  });
});

// Handle 404 Not Found
app.use((req: Request, _res: Response, next) => {
  next(new AppError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server.`, 404, 'NOT_FOUND'));
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
