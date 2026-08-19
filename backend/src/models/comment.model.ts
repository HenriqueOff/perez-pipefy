import { db } from '../config/db';
import { CommentRow } from '../types/entities';

const TABLE = 'comments';

export const CommentModel = {
  listByCard(cardId: number) {
    return db<CommentRow>(TABLE)
      .join('users', 'users.id', 'comments.user_id')
      .where({ card_id: cardId })
      .select('comments.*', 'users.name as user_name')
      .orderBy('comments.created_at', 'asc');
  },

  create(input: { card_id: number; user_id: number; body: string }) {
    return db<CommentRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  findById(id: number) {
    return db<CommentRow>(TABLE).where({ id }).first();
  },

  delete(id: number) {
    return db<CommentRow>(TABLE).where({ id }).delete();
  },
};
