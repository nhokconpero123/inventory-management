import express from 'express';
import type Database from 'better-sqlite3';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { errorHandler } from './middleware/errors';
import { movementsRouter } from './modules/movements/movements.routes';

/** Nhận DB từ bên ngoài để test dùng SQLite :memory:. Không gọi listen ở đây. */
export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });

  });

  app.use('/auth', authRouter(db));
  app.use('/users', usersRouter(db));
  app.use('/categories', categoriesRouter(db));
  app.use(movementsRouter(db)); // mount ở gốc, vì chứa nhiều đường dẫn

  app.use(errorHandler); // PHẢI đặt cuối cùng
  return app;
}