import { z } from 'zod';

export const createPipelineConnectionSchema = z.object({
  target_pipeline_id: z.number().int().positive(),
  name: z.string().min(1).max(150),
});
