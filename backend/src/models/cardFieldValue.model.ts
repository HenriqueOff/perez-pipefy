import { Knex } from 'knex';
import { db } from '../config/db';
import { CardFieldValueRow } from '../types/entities';

const TABLE = 'card_field_values';

export const CardFieldValueModel = {
  listByCard(cardId: number) {
    return db<CardFieldValueRow>(TABLE).where({ card_id: cardId });
  },

  findOne(cardId: number, customFieldId: number, trx: Knex.Transaction | Knex = db) {
    return trx<CardFieldValueRow>(TABLE).where({ card_id: cardId, custom_field_id: customFieldId }).first();
  },

  upsert(cardId: number, customFieldId: number, value: unknown, trx: Knex.Transaction | Knex = db) {
    return trx<CardFieldValueRow>(TABLE)
      .insert({ card_id: cardId, custom_field_id: customFieldId, value: JSON.stringify(value) })
      .onConflict(['card_id', 'custom_field_id'])
      .merge({ value: JSON.stringify(value), updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },
};
