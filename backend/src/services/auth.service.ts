import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { signAccessToken } from '../config/jwt';
import { env } from '../config/env';
import { RefreshTokenModel } from '../models/refreshToken.model';
import { UserModel } from '../models/user.model';
import { AppError } from '../utils/AppError';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const AuthService = {
  async login(email: string, password: string) {
    const user = await UserModel.findByEmail(email);
    if (!user || !user.active) {
      throw AppError.unauthorized('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw AppError.unauthorized('Credenciais inválidas');
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.global_role });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
    await RefreshTokenModel.create(user.id, hashToken(refreshToken), expiresAt);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.global_role },
    };
  },

  async refresh(refreshToken: string) {
    const record = await RefreshTokenModel.findValidByHash(hashToken(refreshToken));
    if (!record) {
      throw AppError.unauthorized('Refresh token inválido ou expirado');
    }

    const user = await UserModel.findById(record.user_id);
    if (!user || !user.active) {
      throw AppError.unauthorized();
    }

    await RefreshTokenModel.revoke(record.id);

    const accessToken = signAccessToken({ sub: user.id, role: user.global_role });
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
    await RefreshTokenModel.create(user.id, hashToken(newRefreshToken), expiresAt);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    const record = await RefreshTokenModel.findValidByHash(hashToken(refreshToken));
    if (record) {
      await RefreshTokenModel.revoke(record.id);
    }
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound();
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      throw new AppError('Senha atual incorreta', 400);
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(userId, password_hash);
    await RefreshTokenModel.revokeAllForUser(userId);
  },
};
