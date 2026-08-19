import { z } from 'zod';

export const upsertImoviewConfigSchema = z.object({
  base_url: z.string().url(),
  api_key: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const importCardFromImoviewSchema = z.object({
  external_type: z.string().min(1).max(100),
  external_id: z.string().min(1).max(150),
  pipeline_id: z.number().int().positive(),
  phase_id: z.number().int().positive().optional(),
});
