import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const verifyTwoFactorSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6),
});

export const confirmTwoFactorSchema = z.object({
  code: z.string().length(6),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});
