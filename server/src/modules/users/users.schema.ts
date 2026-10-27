import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'staff']),
});