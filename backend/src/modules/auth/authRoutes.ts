import { Router } from 'express';
import { register, login, getCurrentUser, getOrganizations, listUsers, updateProfile } from './authController';
import { authenticate } from '../../middleware/authMiddleware';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getCurrentUser);
router.patch('/profile', authenticate, updateProfile);
router.get('/organizations', getOrganizations);
router.get('/users', authenticate, listUsers);

export default router;
