import { z } from 'zod';

/** page mặc định 1, limit mặc định 20, tối đa 100 (theo api-spec.md). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});