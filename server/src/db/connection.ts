import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/** Opens a SQLite connection with the required PRAGMAs. Use ':memory:' for tests. */
export function openDb(file: string = process.env.DB_PATH ?? 'data/inventory.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');   // Improves concurrent reads and writes.
  db.pragma('busy_timeout = 5000');  // Wait up to 5 seconds instead of raising SQLITE_BUSY.
  db.pragma('foreign_keys = ON');    // SQLite disables this by default; enable it on every connection.
  return db;
}

/** Runs schema.sql to create the tables. */
export function applySchema(db: Database.Database) {
  db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
}