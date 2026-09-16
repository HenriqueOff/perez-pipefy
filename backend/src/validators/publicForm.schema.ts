import { z } from 'zod';

export const submitPublicFormSchema = z.object({
  title: z.string().min(1).max(255),
  fields: z.record(z.string(), z.unknown()).optional(),
  // Honeypot: campo que não existe pra gente de verdade (escondido no CSS, fora da ordem
  // de tab). Bot que preenche todo input do formulário cai aqui; gente não. Ver
  // publicForm.controller.ts — quando vem preenchido, a resposta finge sucesso sem
  // criar nada, pra não ensinar o bot a identificar a trava.
  website: z.string().max(200).optional(),
});
