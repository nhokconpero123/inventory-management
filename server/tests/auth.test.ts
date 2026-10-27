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
  it('đúng thông tin → 200, có token và role', async () => {
    const res = await login('admin@demo.com');
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.role).toBe('admin');
  });

  it('sai mật khẩu → 401 INVALID_CREDENTIALS', async () => {
    const res = await login('admin@demo.com', 'sai-mat-khau');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('email không tồn tại → 401 (cùng lỗi với sai mật khẩu)', async () => {
    const res = await login('khong-co@demo.com');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('tài khoản bị vô hiệu hóa → 401', async () => {
    expect((await login('off@demo.com')).status).toBe(401);
  });

  it('thiếu mật khẩu → 400 VALIDATION', async () => {
    const res = await request(ctx.app).post('/auth/login').send({ email: 'admin@demo.com' });
    expect(res.status).toBe(400);
  });
});

describe('requireAuth / requireRole', () => {
  it('không token → 401 UNAUTHORIZED', async () => {
    const res = await request(ctx.app).get('/categories');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('token sai chữ ký → 401', async () => {
    const bad = jwt.sign({ role: 'admin' }, 'secret-khac-secret-khac-secret-khac-12', { subject: '1' });
    const res = await request(ctx.app).get('/categories').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  it('token hết hạn → 401', async () => {
    const old = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET!, { subject: '1', expiresIn: -10 });
    const res = await request(ctx.app).get('/categories').set('Authorization', `Bearer ${old}`);
    expect(res.status).toBe(401);
  });

  it('staff đọc categories → 200', async () => {
    const res = await request(ctx.app).get('/categories').set('Authorization', authHeader('staff'));
    expect(res.status).toBe(200);
  });

  it('staff tạo category → 403 FORBIDDEN', async () => {
    const res = await request(ctx.app)
      .post('/categories')
      .set('Authorization', authHeader('staff'))
      .send({ name: 'Laptop' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'FORBIDDEN' });
  });
});

describe('POST /users', () => {
  const body = { email: 'new@demo.com', name: 'Nhân viên mới', password: 'Demo@12345', role: 'staff' };

  it('admin tạo user → 201, không trả password_hash', async () => {
    const res = await request(ctx.app).post('/users').set('Authorization', authHeader('admin')).send(body);
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new@demo.com');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('staff tạo user → 403', async () => {
    const res = await request(ctx.app).post('/users').set('Authorization', authHeader('staff')).send(body);
    expect(res.status).toBe(403);
  });

  it('trùng email → 409 CONFLICT', async () => {
    const res = await request(ctx.app)
      .post('/users')
      .set('Authorization', authHeader('admin'))
      .send({ ...body, email: 'staff@demo.com' });
    expect(res.status).toBe(409);
  });

  it('mật khẩu dưới 8 ký tự → 400', async () => {
    const res = await request(ctx.app)
      .post('/users')
      .set('Authorization', authHeader('admin'))
      .send({ ...body, password: '123' });
    expect(res.status).toBe(400);
  });

  it('tài khoản vừa tạo đăng nhập được', async () => {
    await request(ctx.app).post('/users').set('Authorization', authHeader('admin')).send(body);
    expect((await login('new@demo.com')).status).toBe(200);
  });
});