import { Router } from 'express';
import { getHealthStatus } from './healthController';

const router = Router();

router.get('/', getHealthStatus);

export default router;
