import { z } from 'zod';

export const createChecklistItemSchema = z.object({
  title: z.string().min(1).max(255),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  done: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});
