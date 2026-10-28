import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeApp, addUser, authHeader } from './helpers';

let ctx: ReturnType<typeof makeApp>;

beforeEach(() => {
  ctx = makeApp();
  addUser(ctx.db, { email: 'admin@demo.com', role: 'admin' });
  addUser(ctx.db, { email: 'staff@demo.com', role: 'staff' });
  addUser(ctx.db, { email: 'off@demo.com', isActive: 0 });
});

const login = (email: string, password = 'Demo@12345') =>
  request(ctx.app).post('/auth/login').send({ email, password });

describe('login', () => {
  it('valid credentials → 200 with token and role', async () => {
    const res = await login('admin@demo.com');
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.role).toBe('admin');
  });

  it('incorrect password → 401 INVALID_CREDENTIALS', async () => {
    const res = await login('admin@demo.com', 'sai-mat-khau');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('nonexistent email → 401 (same error as an incorrect password)', async () => {
    const res = await login('khong-co@demo.com');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('disabled account → 401', async () => {
    expect((await login('off@demo.com')).status).toBe(401);
  });

  it('missing password → 400 VALIDATION', async () => {
    const res = await request(ctx.app).post('/auth/login').send({ email: 'admin@demo.com' });
    expect(res.status).toBe(400);
  });
});

describe('requireAuth / requireRole', () => {
  it('missing token → 401 UNAUTHORIZED', async () => {
    const res = await request(ctx.app).get('/categories');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('invalid token signature → 401', async () => {
    const bad = jwt.sign({ role: 'admin' }, 'secret-khac-secret-khac-secret-khac-12', { subject: '1' });
    const res = await request(ctx.app).get('/categories').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  it('expired token → 401', async () => {
    const old = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET!, { subject: '1', expiresIn: -10 });
    const res = await request(ctx.app).get('/categories').set('Authorization', `Bearer ${old}`);
    expect(res.status).toBe(401);
  });

  it('staff reads categories → 200', async () => {
    const res = await request(ctx.app).get('/categories').set('Authorization', authHeader('staff'));
    expect(res.status).toBe(200);
  });

  it('staff creates a category → 403 FORBIDDEN', async () => {
    const res = await request(ctx.app)
      .post('/categories')
      .set('Authorization', authHeader('staff'))
      .send({ name: 'Laptop' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN' });
  });
});

describe('POST /users', () => {
  const body = { email: 'new@demo.com', name: 'New Staff Member', password: 'Demo@12345', role: 'staff' };

  it('admin creates a user → 201 and does not return password_hash', async () => {
    const res = await request(ctx.app).post('/users').set('Authorization', authHeader('admin')).send(body);
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new@demo.com');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('staff creates a user → 403', async () => {
    const res = await request(ctx.app).post('/users').set('Authorization', authHeader('staff')).send(body);
    expect(res.status).toBe(403);
  });

  it('duplicate email → 409 CONFLICT', async () => {
    const res = await request(ctx.app)
      .post('/users')
      .set('Authorization', authHeader('admin'))
      .send({ ...body, email: 'staff@demo.com' });
    expect(res.status).toBe(409);
  });

  it('password shorter than 8 characters → 400', async () => {
    const res = await request(ctx.app)
      .post('/users')
      .set('Authorization', authHeader('admin'))
      .send({ ...body, password: '123' });
    expect(res.status).toBe(400);
  });

  it('newly created account can sign in', async () => {
    await request(ctx.app).post('/users').set('Authorization', authHeader('admin')).send(body);
    expect((await login('new@demo.com')).status).toBe(200);
  });
});