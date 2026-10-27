import express from 'express';
import type Database from 'better-sqlite3';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { errorHandler } from './middleware/errors';
import { movementsRouter } from './modules/movements/movements.routes';
import { productsRouter } from './modules/products/products.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import cors from 'cors';
import helmet from 'helmet';
/** Nhận DB từ bên ngoài để test dùng SQLite :memory:. Không gọi listen ở đây. */
export function createApp(db: Database.Database) {
  const app = express();
    // Sau proxy của Render, cần tin X-Forwarded-For để rate limit đếm đúng IP người dùng
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());

  // CORS_ORIGIN: danh sách domain frontend được phép, ngăn cách bằng dấu phẩy. Để trống = không bật CORS
  const origins = (process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origins.length) app.use(cors({ origin: origins }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });

  });

  app.use('/auth', authRouter(db));
  app.use('/users', usersRouter(db));
  app.use('/categories', categoriesRouter(db));
  app.use('/products', productsRouter(db));
  app.use('/dashboard', dashboardRouter(db));
  app.use(movementsRouter(db)); // mount ở gốc, vì chứa nhiều đường dẫn

  app.use(errorHandler); // PHẢI đặt cuối cùng
  return app;
}
