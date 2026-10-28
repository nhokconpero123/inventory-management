import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createCategoriesRepo } from './categories.repo';
import { createCategorySchema } from './categories.schema';
import { requireAuth, requireRole } from '../auth/auth.middleware';

export function categoriesRouter(db: Database.Database) {
  const repo = createCategoriesRepo(db);
  const router = Router();

  router.use(requireAuth); // Staff and admins can read.

  router.get('/', (_req, res) => {
    res.json(repo.list());
  });

  router.post('/', requireRole('admin'), (req, res) => {
    const { name } = createCategorySchema.parse(req.body);
    res.status(201).json(repo.create(name));
  });

  return router;
}