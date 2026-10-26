import { Router } from 'express';
import { register, login, getCurrentUser, getOrganizations } from './authController';
import { authenticate } from '../../middleware/authMiddleware';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getCurrentUser);
router.get('/organizations', getOrganizations);

export default router;
