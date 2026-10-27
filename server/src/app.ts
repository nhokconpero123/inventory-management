import express from 'express';
import type Database from 'better-sqlite3';

/** Nhận DB từ bên ngoài để test có thể dùng SQLite :memory:. Không gọi listen ở đây. */
export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get(); // xác nhận DB còn sống
    res.json({ ok: true });
  });

  return app;
}