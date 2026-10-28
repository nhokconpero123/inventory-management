import { Router } from 'express';
import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { createUsersRepo } from '../users/users.repo';
import { loginSchema } from './auth.schema';
import { AppError } from '../../middleware/errors';
import { jwtSecret } from '../../config';

// Compare against a dummy hash when the email does not exist so response time does not reveal valid email addresses.
const DUMMY_HASH = bcrypt.hashSync('dummy', 10);

// Prevent password guessing: at most 20 attempts per IP every 15 minutes (disabled during tests).
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
    // Return the same error for an unknown email, incorrect password, or disabled account.
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
