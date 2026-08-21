import { Knex } from 'knex';
import { db } from '../config/db';
import { CardHistoryRow } from '../types/entities';
import { CardHistoryEventType } from '../types/enums';

const TABLE = 'card_history';

export interface CardHistoryInput {
  card_id: number;
  user_id: number | null;
  event_type: CardHistoryEventType;
  from_phase_id?: number | null;
  to_phase_id?: number | null;
  field_id?: number | null;
  old_value?: unknown;
  new_value?: unknown;
}

export const CardHistoryModel = {
  listByCard(cardId: number) {
    return db<CardHistoryRow>(TABLE)
      .leftJoin('users', 'users.id', 'card_history.user_id')
      .where({ card_id: cardId })
      .select('card_history.*', 'users.name as user_name')
      .orderBy('card_history.created_at', 'desc');
  },

  listPhaseTransitionsByPipeline(pipelineId: number) {
    return db<CardHistoryRow>(TABLE)
      .join('cards', 'cards.id', `${TABLE}.card_id`)
      .where('cards.pipeline_id', pipelineId)
      .whereIn(`${TABLE}.event_type`, ['created', 'moved'])
      .orderBy([`${TABLE}.card_id`, `${TABLE}.created_at`])
      .select(`${TABLE}.card_id`, `${TABLE}.event_type`, `${TABLE}.to_phase_id`, `${TABLE}.created_at`);
  },

  record(input: CardHistoryInput, trx: Knex.Transaction | Knex = db) {
    return trx<CardHistoryRow>(TABLE).insert({
      ...input,
      old_value: input.old_value !== undefined ? JSON.stringify(input.old_value) : null,
      new_value: input.new_value !== undefined ? JSON.stringify(input.new_value) : null,
    });
  },
};
