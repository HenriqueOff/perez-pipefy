import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserModel } from '../models/user.model';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const REFRESH_COOKIE = 'refreshToken';

// 'none' exige 'secure: true' (só é enviado em HTTPS) — combinação necessária quando
// front e back estão em domínios diferentes (Render). Em dev local, 'lax' + sem secure
// funciona pois tudo passa pelo mesmo domínio via proxy do Vite.
const cookieOptions = {
  httpOnly: true,
  secure: env.cookieCrossSite || env.nodeEnv === 'production',
  sameSite: (env.cookieCrossSite ? 'none' : 'lax') as 'none' | 'lax',
  path: '/api/v1/auth',
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    maxAge: env.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000,
  });
}

export const AuthController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password, req.headers['user-agent']);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw AppError.unauthorized('Refresh token ausente');
    }
    const result = await AuthService.refresh(token, req.headers['user-agent']);
    setRefreshCookie(res, result.refreshToken);
    res.json({ accessToken: result.accessToken });
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await AuthService.logout(token);
    }
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      throw AppError.notFound();
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.global_role,
      must_change_password: user.must_change_password,
    });
  },

  async updateMe(req: Request, res: Response) {
    const user = await UserModel.update(req.user!.id, { name: req.body.name });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.global_role,
      must_change_password: user.must_change_password,
    });
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(result);
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    await AuthService.requestPasswordReset(email);
    res.status(204).send();
  },

  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    res.status(204).send();
  },

  async listSessions(req: Request, res: Response) {
    const currentToken = req.cookies?.[REFRESH_COOKIE];
    const sessions = await AuthService.listSessions(req.user!.id, currentToken);
    res.json(sessions);
  },

  async revokeSession(req: Request, res: Response) {
    await AuthService.revokeSession(req.user!.id, Number(req.params.sessionId));
    res.status(204).send();
  },
};
