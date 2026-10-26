import { Router } from 'express';
import { getBatchRiskScore, getAnalyticsSummary } from './analyticsController';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// POST /api/v1/analytics/risk  — AI risk score for a single batch
router.post('/risk', getBatchRiskScore);

// GET  /api/v1/analytics/summary — Platform-wide KPI aggregations
router.get('/summary', getAnalyticsSummary);

export default router;
