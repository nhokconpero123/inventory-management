import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION' | 'UNAUTHORIZED' | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INSUFFICIENT_STOCK';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INSUFFICIENT_STOCK: 409,
};

/** Throw a business error from anywhere: throw new AppError('CONFLICT'). */
export class AppError extends Error {
  constructor(public code: ErrorCode, message?: string) {
    super(message ?? code);
  }
}

/** Final middleware: convert all errors to { error: "ERROR_CODE" } as specified in api-spec.md. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) return res.status(STATUS[err.code]).json({ error: err.code });
  if (err instanceof ZodError) return res.status(400).json({ error: 'VALIDATION' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'VALIDATION' }); // Malformed JSON.
  console.error(err);
  res.status(500).json({ error: 'INTERNAL' });
};
