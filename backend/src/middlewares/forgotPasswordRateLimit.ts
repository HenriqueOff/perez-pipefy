import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const hits = new Map<string, number[]>();

/**
 * Limite simples em memória por IP+e-mail pra rota pública de "esqueci minha senha".
 * Mesma lógica de publicRateLimit.ts, mas chaveada pelo e-mail do body em vez de um
 * token de rota. Se o backend rodar em múltiplas instâncias, precisa migrar pra um
 * armazenamento compartilhado (ex.: Redis).
 */
export function forgotPasswordRateLimit(req: Request, _res: Response, next: NextFunction): void {
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
