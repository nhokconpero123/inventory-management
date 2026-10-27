import { openDb, applySchema } from '../src/db/connection';
import { createApp } from '../src/app';

/** App mới + DB :memory: sạch cho mỗi test. */
export function makeApp() {
  const db = openDb(':memory:');
  applySchema(db);
  return { db, app: createApp(db) };
}