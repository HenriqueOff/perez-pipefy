import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const hits = new Map<string, number[]>();

/**
 * Limite simples em memória por IP+e-mail pra rota de login — sem isso, nada impede
 * força bruta/credential stuffing contra /auth/login (confirmado nesta auditoria: 8
 * tentativas seguidas com senha errada, todas 401, nenhuma bloqueada). Mesmo padrão de
 * forgotPasswordRateLimit.ts/publicRateLimit.ts; se o backend rodar em múltiplas
 * instâncias, precisa migrar pra um armazenamento compartilhado (ex.: Redis).
 */
export function loginRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const key = `${req.ip}:${req.body?.email ?? ''}`;
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    throw new AppError('Muitas tentativas. Tente novamente mais tarde.', 429);
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  next();
}
