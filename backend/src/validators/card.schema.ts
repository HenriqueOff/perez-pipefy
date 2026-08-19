import { z } from 'zod';

export const createCardSchema = z.object({
  title: z.string().min(1).max(255),
  phase_id: z.number().int().positive().optional(),
  assignee_ids: z.array(z.number().int().positive()).optional(),
  due_date: z.string().date().nullable().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  due_date: z.string().date().nullable().optional(),
});

export const assignCardSchema = z.object({
  user_id: z.number().int().positive(),
});

export const moveCardSchema = z.object({
  to_phase_id: z.number().int().positive(),
  position: z.number().int().min(0).optional(),
});

export const updateCardFieldsSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});
