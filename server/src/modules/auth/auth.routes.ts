import { Router } from 'express';
import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { createUsersRepo } from '../users/users.repo';
import { loginSchema } from './auth.schema';
import { AppError } from '../../middleware/errors';
import { jwtSecret } from '../../config';

// So sánh với hash giả khi email không tồn tại, để thời gian phản hồi không lộ email nào có thật
const DUMMY_HASH = bcrypt.hashSync('dummy', 10);

// Chống dò mật khẩu: tối đa 20 lần/15 phút mỗi IP (tắt khi chạy test)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

export function authRouter(db: Database.Database) {
  const users = createUsersRepo(db);
  const router = Router();

  router.post('/login', loginLimiter, (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = users.findByEmail(email);
    const ok = bcrypt.compareSync(password, user?.password_hash ?? DUMMY_HASH);
    // Cùng một lỗi cho: sai email, sai mật khẩu, tài khoản bị vô hiệu hóa
    if (!user || !ok || !user.is_active) throw new AppError('INVALID_CREDENTIALS');

    const token = jwt.sign({ role: user.role }, jwtSecret(), {
      subject: String(user.id),
      expiresIn: '1h',
      algorithm: 'HS256',
    });
    res.json({ token, role: user.role });
  });

  return router;
}