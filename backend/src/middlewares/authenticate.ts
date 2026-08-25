import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { AppError } from '../utils/AppError';

// Rotas acessíveis mesmo com troca de senha pendente — precisam continuar funcionando
// pro usuário conseguir sair do estado "bloqueado" (trocar a senha, ver quem é, sair).
// Comparado por sufixo contra req.originalUrl: dentro de um sub-router (ex: auth.routes.ts
// montado em "/auth"), req.path já vem sem o prefixo de montagem, então só originalUrl
// preserva o caminho completo pra comparar de forma confiável.
const ALLOWED_WHILE_MUST_CHANGE_PASSWORD = ['/auth/change-password', '/auth/me', '/auth/logout'];

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }

  const token = header.slice('Bearer '.length);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado');
  }

  req.user = { id: payload.sub, role: payload.role, mustChangePassword: payload.mustChangePassword };

  const cleanPath = req.originalUrl.split('?')[0];
  const isAllowed = ALLOWED_WHILE_MUST_CHANGE_PASSWORD.some((suffix) => cleanPath.endsWith(suffix));
  if (payload.mustChangePassword && !isAllowed) {
    throw new AppError('Troca de senha obrigatória antes de continuar', 403, { code: 'MUST_CHANGE_PASSWORD' });
  }

  next();
}
