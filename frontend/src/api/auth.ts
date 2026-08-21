import { api } from './client';
import { User } from '../types';

export const AuthApi = {
  me: () => api.get<User>('/auth/me').then((r) => r.data),

  updateProfile: (changes: { name: string }) => api.patch<User>('/auth/me', changes).then((r) => r.data),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', input).then(() => undefined),
};
