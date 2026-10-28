import { Router } from 'express';
import { getBatchRiskScore, getAnalyticsSummary, exportAnalyticsData } from './analyticsController';
import { authenticate } from '../../middleware/authMiddleware';
import { exportLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// GET & POST /api/v1/analytics/risk — AI risk score for a single batch
router.get('/risk', getBatchRiskScore);
router.post('/risk', getBatchRiskScore);

// GET /api/v1/analytics/summary — Platform-wide KPI aggregations
router.get('/summary', getAnalyticsSummary);

// GET /api/v1/analytics/export — Sanitized CSV export of batches or events (rate limited)
router.get('/export', exportLimiter, exportAnalyticsData);

export default router;
