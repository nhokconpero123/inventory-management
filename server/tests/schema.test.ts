import { it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { openDb, applySchema } from '../src/db/connection';

let db: Database.Database;

beforeEach(() => {
  db = openDb(':memory:');
  applySchema(db);
});

it('CHECK chặn tồn kho âm', () => {
  const insert = () =>
    db.prepare("INSERT INTO products (sku, name, quantity) VALUES ('A1', 'Test', -1)").run();
  expect(insert).toThrow();
});

it('sổ cái stock_movements bất biến (cấm UPDATE và DELETE)', () => {
  db.prepare("INSERT INTO products (sku, name) VALUES ('A1', 'Test')").run();
  db.prepare(
    `INSERT INTO stock_movements (product_id, type, quantity_change, quantity_after, idempotency_key)
     VALUES (1, 'IN', 5, 5, 'k1')`
  ).run();

  expect(() => db.prepare('UPDATE stock_movements SET quantity_change = 9').run()).toThrow();
  expect(() => db.prepare('DELETE FROM stock_movements').run()).toThrow();
});

it('foreign key được bật', () => {
  const insert = () =>
    db.prepare(
      `INSERT INTO stock_movements (product_id, type, quantity_change, quantity_after, idempotency_key)
       VALUES (999, 'IN', 1, 1, 'k2')`
    ).run();
  expect(insert).toThrow(); // product_id 999 không tồn tại
});