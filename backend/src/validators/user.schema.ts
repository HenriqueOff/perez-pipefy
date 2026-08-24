import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  password: z.string().min(8),
  global_role: z.enum(['admin', 'member']).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  email: z.string().email().optional(),
  global_role: z.enum(['admin', 'member']).optional(),
  active: z.boolean().optional(),
});
