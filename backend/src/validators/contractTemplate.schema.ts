import { z } from 'zod';

export const createContractTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  body_html: z.string().min(1),
});

export const updateContractTemplateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  body_html: z.string().min(1).optional(),
});
