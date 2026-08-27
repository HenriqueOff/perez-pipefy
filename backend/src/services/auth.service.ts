import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { signAccessToken, signPendingTwoFactorToken, verifyPendingTwoFactorToken } from '../config/jwt';
import { env } from '../config/env';
import { RefreshTokenModel } from '../models/refreshToken.model';
import { PasswordResetTokenModel } from '../models/passwordResetToken.model';
import { UserModel } from '../models/user.model';
import { UserRow } from '../types/entities';
import { AppError } from '../utils/AppError';
import { MailService } from './mail.service';
import { TotpService } from './totp.service';

const RESET_TOKEN_EXPIRES_IN_MS = 60 * 60 * 1000; // 1h

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueSession(user: UserRow, userAgent?: string) {
  const accessToken = signAccessToken({ sub: user.id, role: user.global_role, mustChangePassword: user.must_change_password });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
  await RefreshTokenModel.create(user.id, hashToken(refreshToken), expiresAt, userAgent);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.global_role,
      must_change_password: user.must_change_password,
      totp_enabled: user.totp_enabled,
      theme_preference: user.theme_preference,
    },
  };
}

export const AuthService = {
  async login(email: string, password: string, userAgent?: string) {
    const user = await UserModel.findByEmail(email);
    if (!user || !user.active) {
      throw AppError.unauthorized('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw AppError.unauthorized('Credenciais inválidas');
    }

    if (user.totp_enabled) {
      return { twoFactorRequired: true as const, tempToken: signPendingTwoFactorToken(user.id) };
    }

    return { twoFactorRequired: false as const, ...(await issueSession(user, userAgent)) };
  },

  async verifyTwoFactorLogin(tempToken: string, code: string, userAgent?: string) {
    let payload;
    try {
      payload = verifyPendingTwoFactorToken(tempToken);
    } catch {
      throw AppError.unauthorized('Sessão de login expirada, faça login novamente');
    }

    const user = await UserModel.findById(payload.sub);
    if (!user || !user.active || !user.totp_enabled || !user.totp_secret_encrypted) {
      throw AppError.unauthorized();
    }

    const secret = TotpService.decryptSecret(user.totp_secret_encrypted);
    if (!TotpService.verify(code, secret)) {
      throw new AppError('Código inválido', 400);
    }

    return issueSession(user, userAgent);
  },

  async setupTwoFactor(userId: number) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound();
    }

    const secret = TotpService.generateSecret();
    await UserModel.setPendingTotpSecret(userId, TotpService.encryptSecret(secret));

    const otpauthUrl = TotpService.buildOtpauthUrl(user.email, secret);
    const qrCodeDataUrl = await TotpService.buildQrCodeDataUrl(otpauthUrl);
    return { secret, qrCodeDataUrl };
  },

  async confirmTwoFactor(userId: number, code: string) {
    const user = await UserModel.findById(userId);
    if (!user || !user.totp_secret_encrypted) {
      throw new AppError('Gere um código de configuração antes de confirmar', 400);
    }

    const secret = TotpService.decryptSecret(user.totp_secret_encrypted);
    if (!TotpService.verify(code, secret)) {
      throw new AppError('Código inválido', 400);
    }

    await UserModel.confirmTotp(userId);
  },

  async updateThemePreference(userId: number, themePreference: 'system' | 'light' | 'dark') {
    return UserModel.updateThemePreference(userId, themePreference);
  },

  async disableTwoFactor(userId: number, password: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound();
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError('Senha incorreta', 400);
    }

    await UserModel.disableTotp(userId);
  },

  async refresh(refreshToken: string, userAgent?: string) {
    const record = await RefreshTokenModel.findValidByHash(hashToken(refreshToken));
    if (!record) {
      throw AppError.unauthorized('Refresh token inválido ou expirado');
    }

    const user = await UserModel.findById(record.user_id);
    if (!user || !user.active) {
      throw AppError.unauthorized();
    }

    await RefreshTokenModel.revoke(record.id);

    const accessToken = signAccessToken({ sub: user.id, role: user.global_role, mustChangePassword: user.must_change_password });
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
    // Mantém o user_agent original da sessão em vez do que renovou o token — o refresh
    // acontece em background sem o usuário agir, então o agent "correto" pra exibir na
    // tela de sessões é o do login original, não o de quem/o-que disparou essa renovação.
    await RefreshTokenModel.create(user.id, hashToken(newRefreshToken), expiresAt, record.user_agent ?? userAgent);

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

    // Novo access token já sem mustChangePassword — sem isso, o token que o front tem em
    // memória continuaria bloqueado até expirar, mesmo a senha já tendo sido trocada.
    return { accessToken: signAccessToken({ sub: user.id, role: user.global_role, mustChangePassword: false }) };
  },

  async requestPasswordReset(email: string) {
    const user = await UserModel.findByEmail(email);
    // Não revela se o e-mail existe ou não: a resposta é sempre "sucesso" pra quem chama.
    if (!user || !user.active) {
      return;
    }

    await PasswordResetTokenModel.invalidateAllForUser(user.id);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_IN_MS);
    await PasswordResetTokenModel.create(user.id, hashToken(token), expiresAt);

    const resetUrl = `${env.frontendUrl}/reset-password/${token}`;
    await MailService.sendPasswordReset(user.email, resetUrl);
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await PasswordResetTokenModel.findValidByHash(hashToken(token));
    if (!record) {
      throw new AppError('Link de redefinição inválido ou expirado', 400);
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(record.user_id, password_hash);
    await PasswordResetTokenModel.markUsed(record.id);
    await RefreshTokenModel.revokeAllForUser(record.user_id);
  },

  async listSessions(userId: number, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const sessions = await RefreshTokenModel.listActiveForUser(userId);
    return sessions.map((s) => ({
      id: s.id,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_current: s.token_hash === currentHash,
    }));
  },

  async revokeSession(userId: number, sessionId: number) {
    const session = await RefreshTokenModel.findById(sessionId);
    if (!session || session.user_id !== userId) {
      throw AppError.notFound('Sessão não encontrada');
    }
    await RefreshTokenModel.revoke(sessionId);
  },
};
