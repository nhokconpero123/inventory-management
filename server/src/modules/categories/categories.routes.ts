import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createCategoriesRepo } from './categories.repo';
import { createCategorySchema } from './categories.schema';

export function categoriesRouter(db: Database.Database) {
  const repo = createCategoriesRepo(db);
  const router = Router();

  // TODO(Bước 5): requireAuth cho cả router, requireRole('admin') cho POST

  router.get('/', (_req, res) => {
    res.json(repo.list());
  });

  router.post('/', (req, res) => {
    const { name } = createCategorySchema.parse(req.body); // sai dữ liệu → ZodError → 400
    res.status(201).json(repo.create(name));
  });

  return router;
}