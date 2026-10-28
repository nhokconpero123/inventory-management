import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createProductsRepo } from './products.repo';
import { createProductSchema, listProductsQuerySchema, patchProductSchema, productIdSchema } from './products.schema';
import { requireAuth, requireRole } from '../auth/auth.middleware';

export function productsRouter(db: Database.Database) {
  const repo = createProductsRepo(db);
  const router = Router();
  router.use(requireAuth);

  // Declare the fixed route before /:id.
  router.get('/low-stock', (_req, res) => res.json(repo.lowStock()));

  router.get('/', (req, res) => {
    const query = listProductsQuerySchema.parse(req.query);
    res.json({ ...repo.list(query), page: query.page });
  });

  router.post('/', requireRole('admin'), (req, res) => {
    const body = createProductSchema.parse(req.body);
    res.status(201).json(repo.create(body));
  });

  router.patch('/:id', requireRole('admin'), (req, res) => {
    const { id } = productIdSchema.parse(req.params);
    const body = patchProductSchema.parse(req.body);
    res.json(repo.update(id, body));
  });

  return router;
}
