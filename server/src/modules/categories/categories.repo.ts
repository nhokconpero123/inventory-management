import type Database from 'better-sqlite3';
import { AppError } from '../../middleware/errors';

export interface Category {
  id: number;
  name: string;
}

/** Repo chỉ chứa SQL. Không biết gì về Express/HTTP. */
export function createCategoriesRepo(db: Database.Database) {
  const list = db.prepare('SELECT id, name FROM categories ORDER BY name');
  const insert = db.prepare('INSERT INTO categories (name) VALUES (?) RETURNING id, name');

  return {
    list: () => list.all() as Category[],

    create(name: string): Category {
      try {
        return insert.get(name) as Category;
      } catch (e: any) {
        // Trùng tên (cột name có UNIQUE) → 409
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new AppError('CONFLICT');
        throw e;
      }
    },
  };
}