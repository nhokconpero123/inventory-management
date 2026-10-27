import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeApp, addUser, addProduct, authHeader } from './helpers';

let ctx: ReturnType<typeof makeApp>;
const admin = authHeader('admin');
const staff = authHeader('staff', 2);

beforeEach(() => {
  ctx = makeApp();
  addUser(ctx.db, { email: 'admin@example.com', role: 'admin' });
  addUser(ctx.db, { email: 'staff@example.com', role: 'staff' });
});

describe('dashboard', () => {
  it('returns active product counts and recent movement columns without idempotency key', async () => {
    const low = addProduct(ctx.db, { sku: 'LOW', min: 1 });
    addProduct(ctx.db, { sku: 'OK', quantity: 5, min: 1 });
    addProduct(ctx.db, { sku: 'OFF', isActive: 0, min: 2 });
    ctx.db.prepare(`INSERT INTO stock_movements
      (product_id, type, quantity_change, quantity_after, reason, idempotency_key, created_by)
      VALUES (?, 'IN', 2, 2, 'restock', 'dashboard-key', 1)`).run(low);

    const res = await request(ctx.app).get('/dashboard/summary').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total_products: 2, low_stock_count: 1 });
    expect(res.body.recent_movements).toHaveLength(1);
    expect(res.body.recent_movements[0]).toMatchObject({
      product_id: low, type: 'IN', quantity_change: 2, quantity_after: 2,
      reason: 'restock', created_by: 1,
    });
    expect(res.body.recent_movements[0]).not.toHaveProperty('idempotency_key');
  });

  it('requires authentication', async () => {
    expect((await request(ctx.app).get('/dashboard/summary')).status).toBe(401);
    expect((await request(ctx.app).get('/dashboard/summary').set('Authorization', admin)).status).toBe(200);
  });
});
