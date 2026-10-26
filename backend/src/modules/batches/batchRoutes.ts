import { Router } from 'express';
import { createBatch, listBatches, getBatchById } from './batchController';
import eventRoutes from '../events/eventRoutes';
import { authenticate, requireRoles } from '../../middleware/authMiddleware';

const router = Router();

// Nested event sub-routes: /api/v1/batches/:batchId/events
router.use('/:batchId/events', eventRoutes);

// Authenticated reads
router.get('/', authenticate, listBatches);
router.get('/:id', authenticate, getBatchById);

// Registration restricted to SUPPLIER, PROCESSOR, and ADMIN
router.post(
  '/',
  authenticate,
  requireRoles('SUPPLIER', 'PROCESSOR', 'ADMIN'),
  createBatch
);

export default router;
