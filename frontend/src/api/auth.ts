import { api } from './client';
import { Session, User } from '../types';

export const AuthApi = {
  me: () => api.get<User>('/auth/me').then((r) => r.data),

  updateProfile: (changes: { name: string }) => api.patch<User>('/auth/me', changes).then((r) => r.data),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post<{ accessToken: string }>('/auth/change-password', input).then((r) => r.data),

  listSessions: () => api.get<Session[]>('/auth/sessions').then((r) => r.data),

  revokeSession: (id: number) => api.delete(`/auth/sessions/${id}`).then((r) => r.data),
};
