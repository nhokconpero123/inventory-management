import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { openDb, applySchema } from '../src/db/connection';
import { createApp } from '../src/app';


// Ensure tests always have a secret, even when vitest.config.ts does not provide one.
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-1234';

/** Create a new app and clean :memory: database for each test. */
export function makeApp() {
  const db = openDb(':memory:');
  applySchema(db);
  return { db, app: createApp(db) };
}

/** Insert a user directly into the database (low bcrypt cost keeps tests fast). Returns the ID. */
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

/** Create a valid Authorization header for a role. */
export function authHeader(role: 'admin' | 'staff', id = 1) {
  const token = jwt.sign({ role }, process.env.JWT_SECRET!, { subject: String(id), expiresIn: '1h' });
  return `Bearer ${token}`;
}

/** Insert a product directly into the database for tests (bypasses the API because step 7 is not implemented yet). Returns the ID. */
export function addProduct(
  db: Database.Database,
  o: { sku?: string; name?: string; quantity?: number; min?: number; isActive?: 0 | 1 } = {},
) {
  const r = db
    .prepare('INSERT INTO products (sku, name, quantity, min_quantity, is_active) VALUES (?, ?, ?, ?, ?)')
    .run(o.sku ?? 'A1', o.name ?? 'Test', o.quantity ?? 0, o.min ?? 0, o.isActive ?? 1);
  return Number(r.lastInsertRowid);
}
