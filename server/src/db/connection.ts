import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/** Mở kết nối SQLite với các PRAGMA bắt buộc. Dùng ':memory:' cho test. */
export function openDb(file: string = process.env.DB_PATH ?? 'data/inventory.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');   // đọc/ghi đồng thời tốt hơn
  db.pragma('busy_timeout = 5000');  // chờ tối đa 5s thay vì lỗi SQLITE_BUSY
  db.pragma('foreign_keys = ON');    // mặc định SQLite TẮT, phải bật mỗi kết nối
  return db;
}

/** Chạy schema.sql để tạo bảng. */
export function applySchema(db: Database.Database) {
  db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
}