import type Database from 'better-sqlite3';

export interface RecentMovement {
  id: number;
  product_id: number;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity_change: number;
  quantity_after: number;
  reason: string | null;
  created_by: number | null;
  created_at: string;
}

export function createDashboardRepo(db: Database.Database) {
  return {
    summary() {
      const counts = db.prepare(
        `SELECT COUNT(*) AS total_products,
           SUM(CASE WHEN quantity <= min_quantity THEN 1 ELSE 0 END) AS low_stock_count
         FROM products WHERE is_active = 1`,
      ).get() as { total_products: number; low_stock_count: number | null };
      const recent_movements = db.prepare(
        `SELECT id, product_id, type, quantity_change, quantity_after, reason, created_by, created_at
         FROM stock_movements ORDER BY id DESC LIMIT 10`,
      ).all() as RecentMovement[];
      return { total_products: counts.total_products, low_stock_count: counts.low_stock_count ?? 0, recent_movements };
    },
  };
}
