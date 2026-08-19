import { z } from 'zod';

const triggerTypeSchema = z.enum(['card_created_in_phase', 'card_moved_to_phase', 'field_updated']);
const actionTypeSchema = z.enum(['move_to_phase', 'assign_user', 'add_label', 'remove_label']);

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(150),
  trigger_type: triggerTypeSchema,
  trigger_config: z.record(z.string(), z.unknown()).nullable().optional(),
  action_type: actionTypeSchema,
  action_config: z.record(z.string(), z.unknown()).nullable().optional(),
  active: z.boolean().optional(),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  trigger_config: z.record(z.string(), z.unknown()).nullable().optional(),
  action_type: actionTypeSchema.optional(),
  action_config: z.record(z.string(), z.unknown()).nullable().optional(),
  active: z.boolean().optional(),
});
