import { Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { ScanService } from '../services/scan.service';

/**
 * Endpoints de máquina (não de usuário): pensados para um cron/worker externo dirigir os
 * scans periódicos quando BACKGROUND_SCANS=off. Autenticação é só o segredo compartilhado
 * INTERNAL_API_SECRET no cabeçalho X-Internal-Secret — sem o segredo configurado no
 * ambiente, o endpoint se comporta como inexistente (404).
 */
function assertInternalSecret(req: Request): void {
  if (!env.internalApiSecret) {
    throw AppError.notFound('Rota não encontrada');
  }
  const provided = req.header('x-internal-secret');
  if (!provided || provided !== env.internalApiSecret) {
    throw AppError.unauthorized('Segredo interno inválido');
  }
}

export const InternalController = {
  async runScans(req: Request, res: Response) {
    assertInternalSecret(req);
    const result = await ScanService.runDueScans();
    res.json({ ok: true, ...result });
  },
};
