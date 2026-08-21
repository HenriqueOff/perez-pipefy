import { z } from 'zod';

export const attachCardConnectionSchema = z.object({
  pipeline_connection_id: z.number().int().positive(),
  from_side: z.enum(['owner', 'target']),
  other_card_id: z.number().int().positive(),
});
