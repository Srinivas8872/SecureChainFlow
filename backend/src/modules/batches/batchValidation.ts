import { z } from 'zod';

export const createBatchSchema = z.object({
  batchCode: z
    .string()
    .min(3, 'Batch code must be at least 3 characters')
    .max(50)
    .trim()
    .toUpperCase(),
  productId: z.string().min(1, 'Product selection is required'),
  source: z.string().min(2, 'Source location/origin is required').max(200).trim(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().min(1, 'Unit is required').max(20).trim().toUpperCase(),
  manufactureDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  expiryDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  metadata: z.record(z.any()).optional()
}).refine(data => {
  if (data.expiryDate && data.manufactureDate) {
    return new Date(data.expiryDate) >= new Date(data.manufactureDate);
  }
  return true;
}, {
  message: 'Expiry date must be on or after the manufacture date',
  path: ['expiryDate']
});

export const queryBatchesSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  search: z.string().optional(),
  status: z.enum([
    'REGISTERED',
    'IN_PROCESSING',
    'QUALITY_APPROVED',
    'IN_TRANSIT',
    'STORED',
    'AVAILABLE_FOR_SALE',
    'DELIVERED',
    'RECALLED'
  ]).optional(),
  productId: z.string().optional(),
  organizationId: z.string().optional()
});
