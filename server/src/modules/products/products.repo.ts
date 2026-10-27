import type Database from 'better-sqlite3';
import { AppError } from '../../middleware/errors';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number | null;
  quantity: number;
  min_quantity: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const COLS = 'id, sku, name, category_id, quantity, min_quantity, is_active, created_at, updated_at';

function translateWriteError(error: any): never {
  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new AppError('CONFLICT');
  if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') throw new AppError('VALIDATION');
  throw error;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function createProductsRepo(db: Database.Database) {
  const insert = db.prepare(
    `INSERT INTO products (sku, name, category_id, min_quantity)
     VALUES (@sku, @name, @category_id, @min_quantity) RETURNING ${COLS}`,
  );
  const findById = db.prepare(`SELECT ${COLS} FROM products WHERE id = ?`);
  const lowStock = db.prepare(
    `SELECT ${COLS} FROM products
     WHERE is_active = 1 AND quantity <= min_quantity
     ORDER BY (quantity - min_quantity) ASC`,
  );

  return {
    create(input: { sku: string; name: string; category_id?: number; min_quantity: number }): Product {
      try {
        return insert.get({ ...input, category_id: input.category_id ?? null }) as Product;
      } catch (error) { return translateWriteError(error); }
    },

    update(id: number, input: Record<string, string | number | null>): Product {
      const fields = Object.keys(input);
      const assignments = fields.map((field) => `${field} = @${field}`);
      assignments.push("updated_at = datetime('now')");
      try {
        const row = db.prepare(
          `UPDATE products SET ${assignments.join(', ')} WHERE id = @id RETURNING ${COLS}`,
        ).get({ ...input, id }) as Product | undefined;
        if (!row) throw new AppError('NOT_FOUND');
        return row;
      } catch (error) {
        if (error instanceof AppError) throw error;
        return translateWriteError(error);
      }
    },

    list(f: { q?: string; category_id?: number; low_stock?: '1'; page: number; limit: number }) {
      const where = ['is_active = 1'];
      const params: unknown[] = [];
      if (f.q !== undefined) {
        where.push("(name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\')");
        const q = `%${escapeLike(f.q)}%`;
        params.push(q, q);
      }
      if (f.category_id !== undefined) { where.push('category_id = ?'); params.push(f.category_id); }
      if (f.low_stock) where.push('quantity <= min_quantity');
      const clause = `WHERE ${where.join(' AND ')}`;
      const total = (db.prepare(`SELECT COUNT(*) AS n FROM products ${clause}`).get(...params) as { n: number }).n;
      const items = db.prepare(
        `SELECT ${COLS} FROM products ${clause} ORDER BY name LIMIT ? OFFSET ?`,
      ).all(...params, f.limit, (f.page - 1) * f.limit) as Product[];
      return { items, total };
    },

    lowStock: () => lowStock.all() as Product[],
    findById: (id: number) => findById.get(id) as Product | undefined,
  };
}
