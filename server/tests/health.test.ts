import request from 'supertest';
import { it, expect } from 'vitest';
import { createApp } from '../src/app';
import { openDb, applySchema } from '../src/db/connection';

it('GET /health returns 200', async () => {
  const db = openDb(':memory:');
  applySchema(db);
  const res = await request(createApp(db)).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
