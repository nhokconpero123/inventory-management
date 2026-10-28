import { z } from 'zod';

/** Defaults to page 1 and limit 20, with a maximum limit of 100 (see api-spec.md). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
