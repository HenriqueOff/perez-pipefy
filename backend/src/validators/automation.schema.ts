import { z } from 'zod';

const triggerTypeSchema = z.enum([
  'card_created_in_phase',
  'card_moved_to_phase',
  'card_left_phase',
  'field_updated',
  'sla_breached',
  'recurring_activity',
  'all_connected_cards_in_phase',
]);
const actionTypeSchema = z.enum([
  'move_to_phase',
  'assign_user',
  'add_label',
  'remove_label',
  'update_field',
  'create_card',
  'distribute_assignees',
  'send_email_template',
  'apply_sla_rule',
  'apply_formula',
  'http_request',
  'create_connected_card',
  'move_connected_cards',
]);

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
