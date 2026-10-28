import { z } from 'zod';
import { paginationSchema } from '../../middleware/pagination';

const MAX_QTY = 1_000_000;
const optionalReason = z.string().trim().max(255).optional();

/**
 * IN/OUT: quantity is a positive integer (the system applies the sign).
 * ADJUST: quantity is signed, non-zero, and requires a reason.
 */
export const createMovementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('IN'), quantity: z.number().int().min(1).max(MAX_QTY), reason: optionalReason }),
  z.object({ type: z.literal('OUT'), quantity: z.number().int().min(1).max(MAX_QTY), reason: optionalReason }),
  z.object({
    type: z.literal('ADJUST'),
    quantity: z.number().int().min(-MAX_QTY).max(MAX_QTY).refine((n) => n !== 0, 'quantity must not be 0'),
    reason: z.string().trim().min(1).max(255),
  }),
]);

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const idempotencyKeySchema = z.string().trim().min(1).max(100);

/** A real YYYY-MM-DD date (rejects dates such as 2026-02-31). */
const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const dateStr = z.string().refine(isRealDate, 'Format must be YYYY-MM-DD');

export const listMovementsQuerySchema = paginationSchema
  .extend({
    type: z.enum(['IN', 'OUT', 'ADJUST']).optional(),
    from: dateStr.optional(),
    to: dateStr.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from must be less than or equal to to');