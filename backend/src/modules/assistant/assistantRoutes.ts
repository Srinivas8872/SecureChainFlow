import { Router } from 'express';
import { queryAssistant } from './assistantController';

const router = Router();

// Publicly accessible assistant query
router.post('/query', queryAssistant);

export default router;
