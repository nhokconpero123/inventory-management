import { z } from 'zod';

/** page defaults to 1, limit defaults to 20, and the maximum is 100 (see api-spec.md). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});