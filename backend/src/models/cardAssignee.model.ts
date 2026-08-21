import { db } from '../config/db';

export const CardAssigneeModel = {
  listByCard(cardId: number) {
    return db('card_assignees')
      .join('users', 'users.id', 'card_assignees.user_id')
      .where({ card_id: cardId })
      .select('users.id as user_id', 'users.name')
      .orderBy('users.name') as Promise<{ user_id: number; name: string }[]>;
  },

  listByPipelineCards(pipelineId: number) {
    return db('card_assignees')
      .join('users', 'users.id', 'card_assignees.user_id')
      .join('cards', 'cards.id', 'card_assignees.card_id')
      .where('cards.pipeline_id', pipelineId)
      .select('card_assignees.card_id', 'users.id as user_id', 'users.name') as Promise<
      { card_id: number; user_id: number; name: string }[]
    >;
  },

  attach(cardId: number, userId: number, extra?: { due_date?: string | null; note?: string | null }) {
    const payload = { card_id: cardId, user_id: userId, due_date: extra?.due_date ?? null, note: extra?.note ?? null };
    if (extra?.due_date !== undefined || extra?.note !== undefined) {
      return db('card_assignees')
        .insert(payload)
        .onConflict(['card_id', 'user_id'])
        .merge({ due_date: payload.due_date, note: payload.note });
    }
    return db('card_assignees').insert(payload).onConflict(['card_id', 'user_id']).ignore();
  },

  detach(cardId: number, userId: number) {
    return db('card_assignees').where({ card_id: cardId, user_id: userId }).delete();
  },

  isAssigned(cardId: number, userId: number) {
    return db('card_assignees').where({ card_id: cardId, user_id: userId }).first();
  },
};
