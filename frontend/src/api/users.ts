import { api } from './client';
import { AdminUser, GlobalRole } from '../types';

export const UsersApi = {
  list: () => api.get<AdminUser[]>('/users').then((r) => r.data),

  create: (input: { name: string; email: string; password: string; global_role?: GlobalRole }) =>
    api.post<AdminUser>('/users', input).then((r) => r.data),

  update: (userId: number, changes: { name?: string; global_role?: GlobalRole; active?: boolean }) =>
    api.patch<AdminUser>(`/users/${userId}`, changes).then((r) => r.data),
};
