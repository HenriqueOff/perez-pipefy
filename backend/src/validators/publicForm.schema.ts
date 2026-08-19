import { z } from 'zod';

export const submitPublicFormSchema = z.object({
  title: z.string().min(1).max(255),
  fields: z.record(z.string(), z.unknown()).optional(),
});
