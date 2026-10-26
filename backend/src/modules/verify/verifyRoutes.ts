import { Router } from 'express';
import { verifyBatchByToken } from './verifyController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limit for public verification endpoint (prevent scraping)
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,                   // 60 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'RATE_LIMITED',
    message: 'Too many verification requests. Please try again later.',
  },
});

// Public — no authentication required
router.get('/:token', verifyLimiter, verifyBatchByToken);

export default router;
