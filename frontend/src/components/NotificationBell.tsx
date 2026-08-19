import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NotificationsApi } from '../api/notifications';
import { AppNotification } from '../types';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import Icon from './Icon';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  return `${Math.floor(hours / 24)} d atrás`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(containerRef, () => setOpen(false));

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: NotificationsApi.unreadCount,
    refetchInterval: 30000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: NotificationsApi.list,
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => NotificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: NotificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  function handleClickNotification(n: AppNotification) {
    if (!n.read_at) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.pipeline_id && n.card_id) {
      navigate(`/pipelines/${n.pipeline_id}?card=${n.card_id}`);
    } else if (n.pipeline_id) {
      navigate(`/pipelines/${n.pipeline_id}`);
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="icon-button notification-bell-button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
      >
        <Icon name="bell" size={18} />
        {!!unreadCount && unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notificações</span>
            {!!unreadCount && unreadCount > 0 && (
              <button type="button" className="link-button" onClick={() => markAllReadMutation.mutate()}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications?.length === 0 && <div className="global-search-empty">Nenhuma notificação ainda.</div>}
            {notifications?.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notification-item ${n.read_at ? '' : 'notification-item-unread'}`}
                onClick={() => handleClickNotification(n)}
              >
                <span>{n.message}</span>
                <span className="muted">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
