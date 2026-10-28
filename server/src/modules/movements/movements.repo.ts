import type Database from 'better-sqlite3';
import { AppError } from '../../middleware/errors';

export type MovementType = 'IN' | 'OUT' | 'ADJUST';

/** Movement returned by the API. Intentionally excludes idempotency_key. */
export interface Movement {
  id: number;
  product_id: number;
  type: MovementType;
  quantity_change: number;
  quantity_after: number;
  reason: string | null;
  created_by: number | null;
  created_at: string;
}

export interface RecordInput {
  productId: number;
  type: MovementType;
  quantity: number;
  reason?: string;
  key: string;
  userId: number;
}

const COLS = 'id, product_id, type, quantity_change, quantity_after, reason, created_by, created_at';

export function createMovementsRepo(db: Database.Database) {
  const findByKey = db.prepare(`SELECT ${COLS} FROM stock_movements WHERE idempotency_key = ?`);

  // Conditional UPDATE: succeeds only if stock remains >= 0 after the change.
  const updateStock = db.prepare(
    `UPDATE products SET quantity = quantity + @delta, updated_at = datetime('now')
     WHERE id = @id AND is_active = 1 AND quantity + @delta >= 0
     RETURNING quantity`,
  );
  const productActive = db.prepare('SELECT 1 FROM products WHERE id = ? AND is_active = 1');
  const productExists = db.prepare('SELECT 1 FROM products WHERE id = ?');
  const insertMovement = db.prepare(
    `INSERT INTO stock_movements
       (product_id, type, quantity_change, quantity_after, reason, idempotency_key, created_by)
     VALUES (@productId, @type, @delta, @after, @reason, @key, @userId)
     RETURNING ${COLS}`,
  );

  // Run everything in one transaction: the stock update and ledger write both succeed or both roll back.
  const tx = db.transaction((p: RecordInput) => {
    const dup = findByKey.get(p.key) as Movement | undefined;
    if (dup) {
      // Reusing a key for another product is a client error; do not return the wrong movement.
      if (dup.product_id !== p.productId) throw new AppError('CONFLICT');
      return { movement: dup, replayed: true };
    }

    const delta =
      p.type === 'OUT' ? -Math.abs(p.quantity) : p.type === 'IN' ? Math.abs(p.quantity) : p.quantity;

    const row = updateStock.get({ delta, id: p.productId }) as { quantity: number } | undefined;
    if (!row) {
      if (!productActive.get(p.productId)) throw new AppError('NOT_FOUND');
      throw new AppError('INSUFFICIENT_STOCK');
    }

    const movement = insertMovement.get({
      productId: p.productId,
      type: p.type,
      delta,
      after: row.quantity,
      reason: p.reason || null,
      key: p.key,
      userId: p.userId,
    }) as Movement;
    return { movement, replayed: false };
  });

  return {
    /** The ONLY function allowed to change products.quantity. BEGIN IMMEDIATE serializes writes. */
    record: (p: RecordInput) => tx.immediate(p),

    productExists: (id: number) => Boolean(productExists.get(id)),

    listByProduct(productId: number, limit: number, offset: number) {
      const total = (
        db.prepare('SELECT COUNT(*) AS n FROM stock_movements WHERE product_id = ?').get(productId) as { n: number }
      ).n;
      const items = db
        .prepare(`SELECT ${COLS} FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`)
        .all(productId, limit, offset) as Movement[];
      return { items, total };
    },

    listAll(f: { type?: MovementType; from?: string; to?: string; limit: number; offset: number }) {
      const where: string[] = [];
      const params: unknown[] = [];
      if (f.type) { where.push('type = ?'); params.push(f.type); }
      if (f.from) { where.push('date(created_at) >= ?'); params.push(f.from); }
      if (f.to) { where.push('date(created_at) <= ?'); params.push(f.to); }
      const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const total = (
        db.prepare(`SELECT COUNT(*) AS n FROM stock_movements ${w}`).get(...params) as { n: number }
      ).n;
      const items = db
        .prepare(`SELECT ${COLS} FROM stock_movements ${w} ORDER BY id DESC LIMIT ? OFFSET ?`)
        .all(...params, f.limit, f.offset) as Movement[];
      return { items, total };
    },
  };
}