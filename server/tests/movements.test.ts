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
  it('IN → 201, quantity_change dương, quantity_after đúng', async () => {
    const res = await move({ type: 'IN', quantity: 4, reason: 'Nhập hàng' }, 'k1');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ product_id: pid, type: 'IN', quantity_change: 4, quantity_after: 9 });
    expect(res.body).not.toHaveProperty('idempotency_key');
    expect(stock()).toBe(9);
  });

  it('OUT → 201, quantity_change âm', async () => {
    const res = await move({ type: 'OUT', quantity: 2 }, 'k1');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'OUT', quantity_change: -2, quantity_after: 3 });
    expect(stock()).toBe(3);
  });

  it('xuất vượt tồn → 409 INSUFFICIENT_STOCK, tồn kho và sổ cái không đổi', async () => {
    const res = await move({ type: 'OUT', quantity: 6 }, 'k1');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'INSUFFICIENT_STOCK' });
    expect(stock()).toBe(5);
    expect(ledgerRows()).toBe(0);
  });

  it('thiếu header Idempotency-Key → 400', async () => {
    const res = await move({ type: 'IN', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'VALIDATION' });
  });

  it('gửi trùng key → 200, trả movement cũ, chỉ trừ một lần', async () => {
    const first = await move({ type: 'OUT', quantity: 2 }, 'dup');
    const again = await move({ type: 'OUT', quantity: 2 }, 'dup');
    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect(stock()).toBe(3);
    expect(ledgerRows()).toBe(1);
  });

  it('dùng lại key cho sản phẩm khác → 409 CONFLICT', async () => {
    const other = addProduct(ctx.db, { sku: 'B2', quantity: 5 });
    await move({ type: 'IN', quantity: 1 }, 'same');
    const res = await move({ type: 'IN', quantity: 1 }, 'same', staff, other);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'CONFLICT' });
  });

  it('sản phẩm không tồn tại → 404', async () => {
    const res = await move({ type: 'IN', quantity: 1 }, 'k1', staff, 999);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND' });
  });

  it('sản phẩm đã ẩn → 404', async () => {
    const hidden = addProduct(ctx.db, { sku: 'H1', quantity: 5, isActive: 0 });
    const res = await move({ type: 'IN', quantity: 1 }, 'k1', staff, hidden);
    expect(res.status).toBe(404);
  });

  it('không token → 401', async () => {
    const res = await move({ type: 'IN', quantity: 1 }, 'k1', null);
    expect(res.status).toBe(401);
  });

  it('created_by lấy từ token, bỏ qua giá trị trong body', async () => {
    const res = await move({ type: 'IN', quantity: 1, created_by: 999 }, 'k1');
    expect(res.status).toBe(201);
    expect(res.body.created_by).toBe(staffId);
  });

  it('quantity không hợp lệ (0, âm, thập phân, chuỗi) với IN → 400', async () => {
    for (const [i, q] of [0, -1, 1.5, '3'].entries()) {
      const res = await move({ type: 'IN', quantity: q }, `bad${i}`);
      expect(res.status).toBe(400);
    }
    expect(ledgerRows()).toBe(0);
  });

  it('type lạ → 400', async () => {
    const res = await move({ type: 'DELETE', quantity: 1 }, 'k1');
    expect(res.status).toBe(400);
  });

  it('staff gửi ADJUST → 403', async () => {
    const res = await move({ type: 'ADJUST', quantity: 1, reason: 'Kiểm kê' }, 'k1');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN' });
  });

  it('admin ADJUST dương → 201', async () => {
    const res = await move({ type: 'ADJUST', quantity: 3, reason: 'Kiểm kê thừa' }, 'k1', admin);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'ADJUST', quantity_change: 3, quantity_after: 8 });
  });

  it('admin ADJUST âm làm tồn kho < 0 → 409', async () => {
    const res = await move({ type: 'ADJUST', quantity: -6, reason: 'Kiểm kê thiếu' }, 'k1', admin);
    expect(res.status).toBe(409);
    expect(stock()).toBe(5);
  });

  it('ADJUST thiếu reason → 400', async () => {
    const res = await move({ type: 'ADJUST', quantity: 1 }, 'k1', admin);
    expect(res.status).toBe(400);
  });

  it('ADJUST quantity = 0 → 400', async () => {
    const res = await move({ type: 'ADJUST', quantity: 0, reason: 'x' }, 'k1', admin);
    expect(res.status).toBe(400);
  });

  it('10 request đồng thời xuất 1: chỉ 5 thành công, tồn kho về 0', async () => {
    const rs = await Promise.all(
      Array.from({ length: 10 }, (_, i) => move({ type: 'OUT', quantity: 1 }, `c${i}`)),
    );
    expect(rs.filter((r) => r.status === 201)).toHaveLength(5);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(5);
    expect(stock()).toBe(0);
  });

  it('đối soát: SUM(quantity_change) bằng products.quantity', async () => {
    const p2 = addProduct(ctx.db, { sku: 'B2', quantity: 0 }); // bắt đầu từ 0 để sổ cái khớp tuyệt đối
    await move({ type: 'IN', quantity: 10 }, 'r1', staff, p2);
    await move({ type: 'OUT', quantity: 3 }, 'r2', staff, p2);
    await move({ type: 'ADJUST', quantity: -2, reason: 'Kiểm kê lệch' }, 'r3', admin, p2);
    await move({ type: 'ADJUST', quantity: 1, reason: 'Kiểm kê lệch' }, 'r4', admin, p2);
    await move({ type: 'OUT', quantity: 99 }, 'r5', staff, p2); // bị từ chối, không ghi sổ
    const sum = ctx.db
      .prepare('SELECT SUM(quantity_change) AS s FROM stock_movements WHERE product_id = ?')
      .get(p2) as { s: number };
    expect(stock(p2)).toBe(6);
    expect(sum.s).toBe(6);
  });
});

describe('GET movements', () => {
  it('/products/:id/movements: mới nhất trước, có phân trang', async () => {
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

  it('/products/:id/movements: sản phẩm không có → 404', async () => {
    const res = await request(ctx.app).get('/products/999/movements').set('Authorization', staff);
    expect(res.status).toBe(404);
  });

  it('/movements: lọc theo type', async () => {
    await move({ type: 'IN', quantity: 1 }, 'g1');
    await move({ type: 'OUT', quantity: 1 }, 'g2');
    await move({ type: 'IN', quantity: 2 }, 'g3');
    const res = await request(ctx.app).get('/movements?type=OUT').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].type).toBe('OUT');
  });

  it('/movements: lọc theo khoảng ngày (bao gồm hai đầu)', async () => {
    await move({ type: 'IN', quantity: 1 }, 'g1');
    await move({ type: 'IN', quantity: 1 }, 'g2');
    const old = await request(ctx.app).get('/movements?from=2000-01-01&to=2000-01-02').set('Authorization', staff);
    expect(old.body.total).toBe(0);
    const all = await request(ctx.app).get('/movements?from=2000-01-01&to=2999-12-31').set('Authorization', staff);
    expect(all.body.total).toBe(2);
  });

  it('/movements: tham số sai → 400', async () => {
    for (const q of ['from=hom-nay', 'from=2026-02-31', 'type=XYZ', 'from=2026-12-01&to=2026-01-01', 'page=0']) {
      const res = await request(ctx.app).get(`/movements?${q}`).set('Authorization', staff);
      expect(res.status).toBe(400);
    }
  });

  it('/movements: không token → 401', async () => {
    const res = await request(ctx.app).get('/movements');
    expect(res.status).toBe(401);
  });
});