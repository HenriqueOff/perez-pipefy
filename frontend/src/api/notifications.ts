import { api } from './client';
import { AppNotification } from '../types';

export const NotificationsApi = {
  list: () => api.get<AppNotification[]>('/notifications').then((r) => r.data),

  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),

  markRead: (id: number) => api.post<AppNotification>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
};
