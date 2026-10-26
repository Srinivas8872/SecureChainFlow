import { Router } from 'express';
import { recordEvent, listEventsByBatch } from './eventController';
import { authenticate } from '../../middleware/authMiddleware';

// mergeParams: true allows accessing :batchId from parent router
const router = Router({ mergeParams: true });

router.get('/', authenticate, listEventsByBatch);
router.post('/', authenticate, recordEvent);

export default router;
