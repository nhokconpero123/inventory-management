import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/errors';
import { jwtSecret } from '../../config';
import type { Role } from '../users/users.repo';

/** Xác thực JWT, gắn req.user. Sai/thiếu/hết hạn → 401. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('UNAUTHORIZED');
  try {
    const p = jwt.verify(header.slice(7), jwtSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload;
    req.user = { id: Number(p.sub), role: p.role as Role };
  } catch {
    throw new AppError('UNAUTHORIZED');
  }
  next();
};

/** Dùng SAU requireAuth. Không đủ quyền → 403. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw new AppError('FORBIDDEN');
    next();
  };