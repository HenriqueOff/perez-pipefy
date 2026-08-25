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
