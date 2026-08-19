import { db } from '../config/db';
import { CardExternalRefRow } from '../types/entities';
import { IntegrationProvider } from '../types/enums';

const TABLE = 'card_external_refs';

export const CardExternalRefModel = {
  listByCard(cardId: number) {
    return db<CardExternalRefRow>(TABLE).where({ card_id: cardId });
  },

  upsert(input: { card_id: number; provider: IntegrationProvider; external_id: string; external_type: string }) {
    return db<CardExternalRefRow>(TABLE)
      .insert({ ...input, last_synced_at: db.fn.now() })
      .onConflict(['card_id', 'provider', 'external_type'])
      .merge({ external_id: input.external_id, last_synced_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },
};
