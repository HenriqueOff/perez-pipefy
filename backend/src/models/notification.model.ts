import { db } from '../config/db';
import { NotificationRow } from '../types/entities';
import { NotificationType } from '../types/enums';

const TABLE = 'notifications';

export const NotificationModel = {
  listForUser(userId: number, limit = 30) {
    return db<NotificationRow>(TABLE).where({ user_id: userId }).orderBy('created_at', 'desc').limit(limit);
  },

  countUnread(userId: number) {
    return db<NotificationRow>(TABLE).where({ user_id: userId, read_at: null }).count<{ count: string }[]>('id as count').first();
  },

  create(input: {
    user_id: number;
    type: NotificationType;
    message: string;
    card_id?: number | null;
    pipeline_id?: number | null;
  }) {
    return db<NotificationRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  markRead(id: number, userId: number) {
    return db<NotificationRow>(TABLE).where({ id, user_id: userId }).update({ read_at: db.fn.now() }).returning('*').then((rows) => rows[0]);
  },

  markAllRead(userId: number) {
    return db<NotificationRow>(TABLE).where({ user_id: userId, read_at: null }).update({ read_at: db.fn.now() });
  },

  existsForCardSinceType(cardId: number, type: NotificationType, since: Date) {
    return db<NotificationRow>(TABLE)
      .where({ card_id: cardId, type })
      .andWhere('created_at', '>=', since)
      .first();
  },
};
