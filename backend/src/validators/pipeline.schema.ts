import { z } from 'zod';
import { PIPELINE_TEMPLATES } from '../utils/pipelineTemplates';

const roleSchema = z.enum(['viewer', 'editor', 'manager', 'owner']);
const templateKeys = Object.keys(PIPELINE_TEMPLATES) as [string, ...string[]];

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  template: z.enum(templateKeys).optional(),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).nullable().optional(),
  archived: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['owner', 'manager', 'editor', 'viewer']).default('editor'),
});

export const createPhaseSchema = z.object({
  name: z.string().min(1).max(150),
  position: z.number().int().min(0).optional(),
  color: z.string().max(20).optional(),
  is_initial: z.boolean().optional(),
  is_final: z.boolean().optional(),
  sla_hours: z.number().int().positive().nullable().optional(),
  wip_limit: z.number().int().positive().nullable().optional(),
  min_move_in_role: roleSchema.nullable().optional(),
  min_move_out_role: roleSchema.nullable().optional(),
});

export const updatePhaseSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  position: z.number().int().min(0).optional(),
  color: z.string().max(20).nullable().optional(),
  is_initial: z.boolean().optional(),
  is_final: z.boolean().optional(),
  sla_hours: z.number().int().positive().nullable().optional(),
  wip_limit: z.number().int().positive().nullable().optional(),
  min_move_in_role: roleSchema.nullable().optional(),
  min_move_out_role: roleSchema.nullable().optional(),
});

export const setPhaseManualCardCreationSchema = z.object({
  allow: z.boolean(),
});

export const createCustomFieldSchema = z.object({
  label: z.string().min(1).max(150),
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'key deve conter apenas letras minúsculas, números e underscore'),
  type: z.enum(['text', 'textarea', 'number', 'date', 'boolean', 'select', 'formula', 'database_link', 'photo_gallery']),
  options: z.array(z.string()).optional(),
  formula: z.string().min(1).max(500).optional(),
  linked_database_id: z.number().int().positive().optional(),
  min_view_role: roleSchema.nullable().optional(),
  min_edit_role: roleSchema.nullable().optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateCustomFieldSchema = z.object({
  label: z.string().min(1).max(150).optional(),
  options: z.array(z.string()).optional(),
  formula: z.string().min(1).max(500).optional(),
  min_view_role: roleSchema.nullable().optional(),
  min_edit_role: roleSchema.nullable().optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});
