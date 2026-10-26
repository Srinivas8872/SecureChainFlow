import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(120),
  category: z.string().min(2, 'Category must be at least 2 characters').max(60),
  description: z.string().max(1000).optional(),
  sku: z.string().max(40).optional(),
  ownerOrganizationId: z.string().optional()
});

export const queryProductsSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  search: z.string().optional(),
  category: z.string().optional()
});
