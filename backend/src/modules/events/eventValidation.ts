import { z } from 'zod';

export const createEventSchema = z.object({
  eventType: z.enum([
    'REGISTERED',
    'PROCESSED',
    'QUALITY_CHECKED',
    'DISPATCHED',
    'IN_TRANSIT',
    'RECEIVED',
    'STORED',
    'RETAILED',
    'RECALLED',
    'DELIVERED'
  ]),
  location: z.string().max(200).optional(),
  facility: z.string().max(100).optional(),
  temperature: z.number().min(-50).max(100).optional(),
  humidity: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  occurredAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  idempotencyKey: z.string().max(100).optional(),
  newCustodianOrgId: z.string().optional()
});
