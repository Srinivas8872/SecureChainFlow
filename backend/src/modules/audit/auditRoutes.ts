import { Router } from 'express';
import { listAuditLogs } from './auditController';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();

// Audit logs require authentication
router.use(authenticate);
router.get('/', listAuditLogs);

export default router;
