import { Router } from 'express';
import type Database from 'better-sqlite3';
import { requireAuth } from '../auth/auth.middleware';
import { createDashboardRepo } from './dashboard.repo';

export function dashboardRouter(db: Database.Database) {
  const repo = createDashboardRepo(db);
  const router = Router();
  router.get('/summary', requireAuth, (_req, res) => res.json(repo.summary()));
  return router;
}
