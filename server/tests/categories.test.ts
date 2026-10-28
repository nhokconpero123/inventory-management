import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeApp, authHeader } from './helpers';

let app: ReturnType<typeof makeApp>['app'];
const admin = authHeader('admin');

beforeEach(() => {
  app = makeApp().app;
});

describe('categories', () => {
  it('POST creates a category → 201 and trims whitespace', async () => {
    const res = await request(app).post('/categories').set('Authorization', admin).send({ name: '  Laptop  ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, name: 'Laptop' });
  });

  it('GET returns the created list', async () => {
    await request(app).post('/categories').set('Authorization', admin).send({ name: 'Laptop' });
    const res = await request(app).get('/categories').set('Authorization', admin);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Laptop' }]);
  });

  it('duplicate name → 409 CONFLICT', async () => {
    await request(app).post('/categories').set('Authorization', admin).send({ name: 'Laptop' });
    const res = await request(app).post('/categories').set('Authorization', admin).send({ name: 'Laptop' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'CONFLICT' });
  });

  it('empty name → 400 VALIDATION', async () => {
    const res = await request(app).post('/categories').set('Authorization', admin).send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'VALIDATION' });
  });

  it('missing body → 400 VALIDATION', async () => {
    const res = await request(app).post('/categories').set('Authorization', admin);
    expect(res.status).toBe(400);
  });
});
