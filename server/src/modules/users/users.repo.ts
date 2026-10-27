import type Database from 'better-sqlite3';
import { AppError } from '../../middleware/errors';

export type Role = 'admin' | 'staff';

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  is_active: number;
  created_at: string;
}

/** Bản an toàn để trả ra API: KHÔNG có password_hash. */
export type PublicUser = Omit<UserRow, 'password_hash'>;

export function createUsersRepo(db: Database.Database) {
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const insert = db.prepare(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES (@email, @name, @passwordHash, @role)
     RETURNING id, email, name, role, is_active, created_at`,
  );

  return {
    findByEmail: (email: string) => byEmail.get(email) as UserRow | undefined,

    create(u: { email: string; name: string; passwordHash: string; role: Role }): PublicUser {
      try {
        return insert.get(u) as PublicUser;
      } catch (e: any) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new AppError('CONFLICT'); // trùng email
        throw e;
      }
    },
  };
}