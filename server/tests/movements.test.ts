import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeApp, addUser, addProduct, authHeader } from './helpers';

let ctx: ReturnType<typeof makeApp>;
let pid: number;
let adminId: number;
let staffId: number;
let admin: string;
let staff: string;

beforeEach(() => {
  ctx = makeApp();
  adminId = addUser(ctx.db, { email: 'admin@demo.com', role: 'admin' });
  staffId = addUser(ctx.db, { email: 'staff@demo.com', role: 'staff' });
  pid = addProduct(ctx.db, { sku: 'A1', quantity: 5, min: 3 });
  admin = authHeader('admin', adminId);
  staff = authHeader('staff', staffId);
});

const move = (body: object, key?: string, auth: string | null = staff, id: number = pid) => {
  const req = request(ctx.app).post(`/products/${id}/movements`);
  if (auth) req.set('Authorization', auth);
  if (key) req.set('Idempotency-Key', key);
  return req.send(body);
};
const stock = (id: number = pid) =>
  (ctx.db.prepare('SELECT quantity FROM products WHERE id = ?').get(id) as { quantity: number }).quantity;
const ledgerRows = () =>
  (ctx.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get() as { n: number }).n;

describe('POST /products/:id/movements', () => {
  it('IN → 201, quantity_change is positive, and quantity_after is correct', async () => {
    const res = await move({ type: 'IN', quantity: 4, reason: 'Stock received' }, 'k1');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ product_id: pid, type: 'IN', quantity_change: 4, quantity_after: 9 });
    expect(res.body).not.toHaveProperty('idempotency_key');
    expect(stock()).toBe(9);
  });

  it('OUT → 201, quantity_change is negative', async () => {
    const res = await move({ type: 'OUT', quantity: 2 }, 'k1');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'OUT', quantity_change: -2, quantity_after: 3 });
    expect(stock()).toBe(3);
  });

  it('stocking out beyond available quantity → 409 INSUFFICIENT_STOCK; stock and ledger remain unchanged', async () => {
    const res = await move({ type: 'OUT', quantity: 6 }, 'k1');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'INSUFFICIENT_STOCK' });
    expect(stock()).toBe(5);
    expect(ledgerRows()).toBe(0);
  });

  it('missing Idempotency-Key header → 400', async () => {
    const res = await move({ type: 'IN', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'VALIDATION' });
  });

  it('repeated key → 200, returns the existing movement, and deducts only once', async () => {
    const first = await move({ type: 'OUT', quantity: 2 }, 'dup');
    const again = await move({ type: 'OUT', quantity: 2 }, 'dup');
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect(stock()).toBe(3);
    expect(ledgerRows()).toBe(1);
  });

  it('reusing a key for another product → 409 CONFLICT', async () => {
    const other = addProduct(ctx.db, { sku: 'B2', quantity: 5 });
    await move({ type: 'IN', quantity: 1 }, 'same');
    const res = await move({ type: 'IN', quantity: 1 }, 'same', staff, other);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'CONFLICT' });
  });

  it('nonexistent product → 404', async () => {
    const res = await move({ type: 'IN', quantity: 1 }, 'k1', staff, 999);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND' });
  });

  it('inactive product → 404', async () => {
    const hidden = addProduct(ctx.db, { sku: 'H1', quantity: 5, isActive: 0 });
    const res = await move({ type: 'IN', quantity: 1 }, 'k1', staff, hidden);
    expect(res.status).toBe(404);
  });

  it('missing token → 401', async () => {
    const res = await move({ type: 'IN', quantity: 1 }, 'k1', null);
    expect(res.status).toBe(401);
  });

  it('created_by comes from the token and ignores the value in the body', async () => {
    const res = await move({ type: 'IN', quantity: 1, created_by: 999 }, 'k1');
    expect(res.status).toBe(201);
    expect(res.body.created_by).toBe(staffId);
  });

  it('invalid IN quantity (0, negative, decimal, or string) → 400', async () => {
    for (const [i, q] of [0, -1, 1.5, '3'].entries()) {
      const res = await move({ type: 'IN', quantity: q }, `bad${i}`);
      expect(res.status).toBe(400);
    }
    expect(ledgerRows()).toBe(0);
  });

  it('unknown type → 400', async () => {
    const res = await move({ type: 'DELETE', quantity: 1 }, 'k1');
    expect(res.status).toBe(400);
  });

  it('staff submits ADJUST → 403', async () => {
    const res = await move({ type: 'ADJUST', quantity: 1, reason: 'Inventory count' }, 'k1');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN' });
  });

  it('admin ADJUST with a positive quantity → 201', async () => {
    const res = await move({ type: 'ADJUST', quantity: 3, reason: 'Inventory count found extra stock' }, 'k1', admin);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'ADJUST', quantity_change: 3, quantity_after: 8 });
  });

  it('admin ADJUST reducing stock below 0 → 409', async () => {
    const res = await move({ type: 'ADJUST', quantity: -6, reason: 'Inventory count found missing stock' }, 'k1', admin);
    expect(res.status).toBe(409);
    expect(stock()).toBe(5);
  });

  it('ADJUST without a reason → 400', async () => {
    const res = await move({ type: 'ADJUST', quantity: 1 }, 'k1', admin);
    expect(res.status).toBe(400);
  });

  it('ADJUST quantity = 0 → 400', async () => {
    const res = await move({ type: 'ADJUST', quantity: 0, reason: 'x' }, 'k1', admin);
    expect(res.status).toBe(400);
  });

  it('10 concurrent stock-out requests of 1: only 5 succeed and stock reaches 0', async () => {
    const rs = await Promise.all(
      Array.from({ length: 10 }, (_, i) => move({ type: 'OUT', quantity: 1 }, `c${i}`)),
    );
    expect(rs.filter((r) => r.status === 201)).toHaveLength(5);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(5);
    expect(stock()).toBe(0);
  });

  it('reconciliation: SUM(quantity_change) equals products.quantity', async () => {
    const p2 = addProduct(ctx.db, { sku: 'B2', quantity: 0 }); // Start at 0 so the ledger matches exactly.
    await move({ type: 'IN', quantity: 10 }, 'r1', staff, p2);
    await move({ type: 'OUT', quantity: 3 }, 'r2', staff, p2);
    await move({ type: 'ADJUST', quantity: -2, reason: 'Inventory count discrepancy' }, 'r3', admin, p2);
    await move({ type: 'ADJUST', quantity: 1, reason: 'Inventory count discrepancy' }, 'r4', admin, p2);
    await move({ type: 'OUT', quantity: 99 }, 'r5', staff, p2); // Rejected; not recorded in the ledger.
    const sum = ctx.db
      .prepare('SELECT SUM(quantity_change) AS s FROM stock_movements WHERE product_id = ?')
      .get(p2) as { s: number };
    expect(stock(p2)).toBe(6);
    expect(sum.s).toBe(6);
  });
});

describe('GET movements', () => {
  it('/products/:id/movements: newest first with pagination', async () => {
    await move({ type: 'IN', quantity: 1 }, 'g1');
    await move({ type: 'IN', quantity: 2 }, 'g2');
    await move({ type: 'IN', quantity: 3 }, 'g3');

    const p1 = await request(ctx.app).get(`/products/${pid}/movements?limit=2`).set('Authorization', staff);
    expect(p1.status).toBe(200);
    expect(p1.body.total).toBe(3);
    expect(p1.body.page).toBe(1);
    expect(p1.body.items).toHaveLength(2);
    expect(p1.body.items[0].quantity_change).toBe(3);

    const p2 = await request(ctx.app).get(`/products/${pid}/movements?limit=2&page=2`).set('Authorization', staff);
    expect(p2.body.items).toHaveLength(1);
  });

  it('/products/:id/movements: product with no movements → 404', async () => {
    const res = await request(ctx.app).get('/products/999/movements').set('Authorization', staff);
    expect(res.status).toBe(404);
  });

  it('/movements: filter by type', async () => {
    await move({ type: 'IN', quantity: 1 }, 'g1');
    await move({ type: 'OUT', quantity: 1 }, 'g2');
    await move({ type: 'IN', quantity: 2 }, 'g3');
    const res = await request(ctx.app).get('/movements?type=OUT').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].type).toBe('OUT');
  });

  it('/movements: filter by date range (inclusive)', async () => {
    await move({ type: 'IN', quantity: 1 }, 'g1');
    await move({ type: 'IN', quantity: 1 }, 'g2');
    const old = await request(ctx.app).get('/movements?from=2000-01-01&to=2000-01-02').set('Authorization', staff);
    expect(old.body.total).toBe(0);
    const all = await request(ctx.app).get('/movements?from=2000-01-01&to=2999-12-31').set('Authorization', staff);
    expect(all.body.total).toBe(2);
  });

  it('/movements: invalid parameters → 400', async () => {
    for (const q of ['from=hom-nay', 'from=2026-02-31', 'type=XYZ', 'from=2026-12-01&to=2026-01-01', 'page=0']) {
      const res = await request(ctx.app).get(`/movements?${q}`).set('Authorization', staff);
      expect(res.status).toBe(400);
    }
  });

  it('/movements: missing token → 401', async () => {
    const res = await request(ctx.app).get('/movements');
    expect(res.status).toBe(401);
  });
});