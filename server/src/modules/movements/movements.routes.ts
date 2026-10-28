import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createMovementsRepo } from './movements.repo';
import {
  createMovementSchema,
  idParamSchema,
  idempotencyKeySchema,
  listMovementsQuerySchema,
} from './movements.schema';
import { paginationSchema } from '../../middleware/pagination';
import { requireAuth } from '../auth/auth.middleware';
import { AppError } from '../../middleware/errors';

/**
 * This router is mounted at the root (app.use(movementsRouter(db))) because it contains both /products/:id/movements and /movements.
 * Attach requireAuth to EACH route instead of using router.use, which would block unrelated routes.
 */
export function movementsRouter(db: Database.Database) {
  const repo = createMovementsRepo(db);
  const router = Router();

  router.post('/products/:id/movements', requireAuth, (req, res) => {
    // Check permissions before validation so staff always receive 403 when submitting ADJUST.
    if (req.body?.type === 'ADJUST' && req.user!.role !== 'admin') throw new AppError('FORBIDDEN');

    const { id } = idParamSchema.parse(req.params);
    const key = idempotencyKeySchema.parse(req.header('Idempotency-Key')); // Missing header returns 400.
    const body = createMovementSchema.parse(req.body);

    const { movement, replayed } = repo.record({
      productId: id,
      type: body.type,
      quantity: body.quantity,
      reason: body.reason,
      key,
      userId: req.user!.id, // Always use the JWT; never read this from the body.
    });
    res.status(replayed ? 200 : 201).json(movement);
  });

  router.get('/products/:id/movements', requireAuth, (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { page, limit } = paginationSchema.parse(req.query);
    if (!repo.productExists(id)) throw new AppError('NOT_FOUND');
    res.json({ ...repo.listByProduct(id, limit, (page - 1) * limit), page });
  });

  router.get('/movements', requireAuth, (req, res) => {
    const { page, limit, type, from, to } = listMovementsQuerySchema.parse(req.query);
    res.json({ ...repo.listAll({ type, from, to, limit, offset: (page - 1) * limit }), page });
  });

  return router;
}
