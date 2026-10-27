import { z } from 'zod';
import { paginationSchema } from '../../middleware/pagination';

const productFields = {
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(255),
  category_id: z.number().int().positive().nullable().optional(),
  min_quantity: z.number().int().min(0).default(0),
};

export const createProductSchema = z.object({
  sku: productFields.sku,
  name: productFields.name,
  category_id: z.number().int().positive().optional(),
  min_quantity: productFields.min_quantity,
}).strict();

export const patchProductSchema = z.object({
  sku: productFields.sku.optional(),
  name: productFields.name.optional(),
  category_id: productFields.category_id,
  min_quantity: z.number().int().min(0).optional(),
  is_active: z.union([z.literal(0), z.literal(1)]).optional(),
}).strict().refine((body) => Object.keys(body).length > 0);

export const productIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const listProductsQuerySchema = paginationSchema.extend({
  q: z.string().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  low_stock: z.literal('1').optional(),
}).strict();
