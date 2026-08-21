import { z } from 'zod';

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  subject: z.string().min(1).max(255),
  body_html: z.string().min(1),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  subject: z.string().min(1).max(255).optional(),
  body_html: z.string().min(1).optional(),
});
