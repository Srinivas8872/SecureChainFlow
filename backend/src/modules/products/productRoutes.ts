import { Router } from 'express';
import { createProduct, listProducts, getProductById } from './productController';
import { authenticate, requireRoles } from '../../middleware/authMiddleware';

const router = Router();

// Publicly authenticated consortium reads
router.get('/', authenticate, listProducts);
router.get('/:id', authenticate, getProductById);

// Restricted creation to SUPPLIER, PROCESSOR, and ADMIN
router.post(
  '/',
  authenticate,
  requireRoles('SUPPLIER', 'PROCESSOR', 'ADMIN'),
  createProduct
);

export default router;
