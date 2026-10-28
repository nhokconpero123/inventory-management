import { Router } from 'express';
import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { createUsersRepo } from './users.repo';
import { createUserSchema } from './users.schema';
import { requireAuth, requireRole } from '../auth/auth.middleware';

export function usersRouter(db: Database.Database) {
  const repo = createUsersRepo(db);
  const router = Router();

  router.use(requireAuth, requireRole('admin')); // All /users routes are admin-only.

  router.post('/', (req, res) => {
    const { password, ...rest } = createUserSchema.parse(req.body);
    const passwordHash = bcrypt.hashSync(password, 10);
    res.status(201).json(repo.create({ ...rest, passwordHash }));
  });

  return router;
}