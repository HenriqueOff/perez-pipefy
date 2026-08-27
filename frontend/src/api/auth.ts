import { api } from './client';
import { Session, ThemePreference, User } from '../types';

export const AuthApi = {
  me: () => api.get<User>('/auth/me').then((r) => r.data),

  updateProfile: (changes: { name: string }) => api.patch<User>('/auth/me', changes).then((r) => r.data),

  updateTheme: (theme_preference: ThemePreference) =>
    api.patch<{ theme_preference: ThemePreference }>('/auth/theme', { theme_preference }).then((r) => r.data),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post<{ accessToken: string }>('/auth/change-password', input).then((r) => r.data),

  listSessions: () => api.get<Session[]>('/auth/sessions').then((r) => r.data),

  revokeSession: (id: number) => api.delete(`/auth/sessions/${id}`).then((r) => r.data),

  setupTwoFactor: () => api.post<{ secret: string; qrCodeDataUrl: string }>('/auth/2fa/setup').then((r) => r.data),

  confirmTwoFactor: (code: string) => api.post('/auth/2fa/confirm', { code }).then((r) => r.data),

  disableTwoFactor: (password: string) => api.post('/auth/2fa/disable', { password }).then((r) => r.data),
};
