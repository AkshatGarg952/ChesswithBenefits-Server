import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  username: z.string().trim().min(3).max(50).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional(),
});
