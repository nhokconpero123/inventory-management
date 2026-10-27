import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { openDb, applySchema } from '../src/db/connection';
import { createApp } from '../src/app';


// Đảm bảo luôn có secret khi chạy test, kể cả khi vitest.config.ts thiếu
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-1234';

/** App mới + DB :memory: sạch cho mỗi test. */
export function makeApp() {
  const db = openDb(':memory:');
  applySchema(db);
  return { db, app: createApp(db) };
}

/** Tạo user trực tiếp trong DB (cost bcrypt thấp cho test chạy nhanh). Trả về id. */
export function addUser(
  db: Database.Database,
  o: { email: string; role?: 'admin' | 'staff'; password?: string; isActive?: 0 | 1 },
) {
  const hash = bcrypt.hashSync(o.password ?? 'Demo@12345', 4);
  const r = db
    .prepare('INSERT INTO users (email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)')
    .run(o.email, o.email, hash, o.role ?? 'staff', o.isActive ?? 1);
  return Number(r.lastInsertRowid);
}

/** Header Authorization hợp lệ cho một role. */
export function authHeader(role: 'admin' | 'staff', id = 1) {
  const token = jwt.sign({ role }, process.env.JWT_SECRET!, { subject: String(id), expiresIn: '1h' });
  return `Bearer ${token}`;
}

/** Tạo sản phẩm trực tiếp trong DB cho test (bỏ qua API vì Bước 7 mới làm). Trả về id. */
export function addProduct(
  db: Database.Database,
  o: { sku?: string; name?: string; quantity?: number; min?: number; isActive?: 0 | 1 } = {},
) {
  const r = db
    .prepare('INSERT INTO products (sku, name, quantity, min_quantity, is_active) VALUES (?, ?, ?, ?, ?)')
    .run(o.sku ?? 'A1', o.name ?? 'Test', o.quantity ?? 0, o.min ?? 0, o.isActive ?? 1);
  return Number(r.lastInsertRowid);
}