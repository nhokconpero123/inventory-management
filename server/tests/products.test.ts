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

describe('products', () => {
  it('POST admin creates product with zero stock and full columns', async () => {
    const res = await request(ctx.app).post('/products').set('Authorization', admin)
      .send({ sku: ' P1 ', name: ' Product 1 ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sku: 'P1', name: 'Product 1', quantity: 0, min_quantity: 0, is_active: 1 });
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).toHaveProperty('updated_at');
  });

  it('enforces write roles and authentication', async () => {
    const body = { sku: 'P1', name: 'Product' };
    expect((await request(ctx.app).post('/products').set('Authorization', staff).send(body)).status).toBe(403);
    expect((await request(ctx.app).post('/products').send(body)).status).toBe(401);
  });

  it('validates required fields, category foreign key, and duplicate sku', async () => {
    expect((await request(ctx.app).post('/products').set('Authorization', admin).send({ name: 'x' })).status).toBe(400);
    expect((await request(ctx.app).post('/products').set('Authorization', admin).send({ sku: 'x' })).status).toBe(400);
    expect((await request(ctx.app).post('/products').set('Authorization', admin).send({ sku: 'x', name: 'x', category_id: 44 })).status).toBe(400);
    const body = { sku: 'x', name: 'x' };
    await request(ctx.app).post('/products').set('Authorization', admin).send(body);
    expect((await request(ctx.app).post('/products').set('Authorization', admin).send(body)).status).toBe(409);
  });

  it('rejects quantity on create rather than accepting a client stock value', async () => {
    // quantity is intentionally absent from the strict create schema; stock starts at zero.
    const res = await request(ctx.app).post('/products').set('Authorization', admin).send({ sku: 'P1', name: 'x', quantity: 8 });
    expect(res.status).toBe(400);
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM products').get()).toMatchObject({ n: 0 });
  });

  it('PATCH edits allowed fields and rejects quantity and empty body', async () => {
    const id = addProduct(ctx.db, { sku: 'A', name: 'Old' });
    const res = await request(ctx.app).patch(`/products/${id}`).set('Authorization', admin)
      .send({ name: 'New', min_quantity: 4 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'New', min_quantity: 4, quantity: 0 });
    expect((await request(ctx.app).patch(`/products/${id}`).set('Authorization', admin).send({ quantity: 10 })).status).toBe(400);
    expect((await request(ctx.app).patch(`/products/${id}`).set('Authorization', admin).send({})).status).toBe(400);
  });

  it('PATCH returns 404/409 as appropriate and requires admin', async () => {
    const id = addProduct(ctx.db, { sku: 'A' });
    addProduct(ctx.db, { sku: 'B' });
    expect((await request(ctx.app).patch('/products/999').set('Authorization', admin).send({ name: 'x' })).status).toBe(404);
    expect((await request(ctx.app).patch(`/products/${id}`).set('Authorization', admin).send({ sku: 'B' })).status).toBe(409);
    expect((await request(ctx.app).patch(`/products/${id}`).set('Authorization', staff).send({ name: 'x' })).status).toBe(403);
  });

  it('lists active products with filtering, pagination, escaped LIKE, and low stock', async () => {
    const star = addProduct(ctx.db, { sku: 'S%_\\', name: 'Needle%_\\', min: 2 });
    addProduct(ctx.db, { sku: 'B', name: 'Other', quantity: 2 });
    addProduct(ctx.db, { sku: 'C', name: 'Inactive', isActive: 0 });
    const matched = await request(ctx.app).get('/products').set('Authorization', staff).query({ q: '%_\\', limit: 1 });
    expect(matched.status).toBe(200);
    expect(matched.body).toMatchObject({ total: 1, page: 1 });
    expect(matched.body.items[0].id).toBe(star);
    expect((await request(ctx.app).get('/products').set('Authorization', staff).query({ low_stock: '1' })).body.items)
      .toHaveLength(1);
    const id = addProduct(ctx.db, { sku: 'Z', name: 'To deactivate' });
    await request(ctx.app).patch(`/products/${id}`).set('Authorization', admin).send({ is_active: 0 });
    const all = await request(ctx.app).get('/products').set('Authorization', staff);
    expect(all.body.items.some((p: { id: number }) => p.id === id)).toBe(false);
  });

  it('serves low stock endpoint and validates query parameters', async () => {
    addProduct(ctx.db, { sku: 'LOW', name: 'Low', min: 1 });
    addProduct(ctx.db, { sku: 'HIDDEN', name: 'Hidden', min: 4, isActive: 0 });
    expect((await request(ctx.app).get('/products/low-stock').set('Authorization', staff)).body).toHaveLength(1);
    expect((await request(ctx.app).get('/products').set('Authorization', staff).query({ low_stock: 'true' })).status).toBe(400);
  });
});
