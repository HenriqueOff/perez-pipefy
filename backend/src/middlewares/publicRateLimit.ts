import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const hits = new Map<string, number[]>();

/**
 * Limite simples em memória por IP+token para a rota pública de criação de card.
 * Suficiente para uma instância única; se o backend rodar em múltiplas instâncias
 * no futuro, isso precisa migrar para um armazenamento compartilhado (ex.: Redis).
 */
export function publicRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const key = `${req.ip}:${req.params.token}`;
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    throw new AppError('Muitas tentativas. Tente novamente mais tarde.', 429);
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  next();
}
