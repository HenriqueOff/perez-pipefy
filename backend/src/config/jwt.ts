import jwt from 'jsonwebtoken';
import { env } from './env';
import { GlobalRole } from '../types/enums';

export interface AccessTokenPayload {
  sub: number;
  role: GlobalRole;
  mustChangePassword: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as unknown as AccessTokenPayload;
}

export interface PendingTwoFactorPayload {
  sub: number;
  pending2fa: true;
}

// Token curto (5min) emitido no lugar do access token normal quando o login exige um
// segundo fator — só serve pra provar, na chamada seguinte de /auth/login/verify-2fa,
// que a senha já foi validada; não concede acesso a nenhuma rota autenticada.
export function signPendingTwoFactorToken(userId: number): string {
  return jwt.sign({ sub: userId, pending2fa: true }, env.jwtSecret, { expiresIn: '5m' });
}

export function verifyPendingTwoFactorToken(token: string): PendingTwoFactorPayload {
  const payload = jwt.verify(token, env.jwtSecret) as unknown as { sub: number; pending2fa?: true };
  if (!payload.pending2fa) {
    throw new Error('Token não é um token pendente de 2FA');
  }
  return payload as PendingTwoFactorPayload;
}
