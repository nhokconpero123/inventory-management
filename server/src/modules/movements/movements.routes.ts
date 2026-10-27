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
 * Router này mount ở gốc (app.use(movementsRouter(db))) vì chứa cả /products/:id/movements và /movements.
 * Vì vậy requireAuth gắn trên TỪNG route, không dùng router.use (sẽ chặn nhầm các route khác).
 */
export function movementsRouter(db: Database.Database) {
  const repo = createMovementsRepo(db);
  const router = Router();

  router.post('/products/:id/movements', requireAuth, (req, res) => {
    // Kiểm tra quyền trước khi validate để staff gửi ADJUST luôn nhận 403
    if (req.body?.type === 'ADJUST' && req.user!.role !== 'admin') throw new AppError('FORBIDDEN');

    const { id } = idParamSchema.parse(req.params);
    const key = idempotencyKeySchema.parse(req.header('Idempotency-Key')); // thiếu header → 400
    const body = createMovementSchema.parse(req.body);

    const { movement, replayed } = repo.record({
      productId: id,
      type: body.type,
      quantity: body.quantity,
      reason: body.reason,
      key,
      userId: req.user!.id, // luôn lấy từ JWT, KHÔNG lấy từ body
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