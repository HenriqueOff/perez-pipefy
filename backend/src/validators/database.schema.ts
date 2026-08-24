import { z } from 'zod';

const roleSchema = z.enum(['viewer', 'editor', 'manager', 'owner']);

export const createDatabaseSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
});

export const updateDatabaseSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).nullable().optional(),
  archived: z.boolean().optional(),
});

export const addDatabaseMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: roleSchema.default('editor'),
});

export const createDatabaseFieldSchema = z.object({
  label: z.string().min(1).max(150),
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'key deve conter apenas letras minúsculas, números e underscore'),
  type: z.enum(['text', 'textarea', 'number', 'date', 'boolean', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateDatabaseFieldSchema = z.object({
  label: z.string().min(1).max(150).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const createDatabaseRecordSchema = z.object({
  title: z.string().min(1).max(255),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export const updateDatabaseRecordSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const updateDatabaseRecordFieldsSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});
