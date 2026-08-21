import { db } from '../config/db';
import { CardConnectionRow } from '../types/entities';

const TABLE = 'card_connections';

export interface ConnectedCardRow {
  card_connection_id: number;
  pipeline_connection_id: number;
  card_id: number;
  title: string;
  pipeline_id: number;
  pipeline_name: string;
  phase_name: string;
}

export const CardConnectionModel = {
  findById(id: number) {
    return db<CardConnectionRow>(TABLE).where({ id }).first();
  },

  findOne(pipelineConnectionId: number, ownerCardId: number, targetCardId: number) {
    return db<CardConnectionRow>(TABLE)
      .where({ pipeline_connection_id: pipelineConnectionId, owner_card_id: ownerCardId, target_card_id: targetCardId })
      .first();
  },

  create(input: { pipeline_connection_id: number; owner_card_id: number; target_card_id: number }) {
    return db<CardConnectionRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<CardConnectionRow>(TABLE).where({ id }).delete();
  },

  /** Cards conectados a `cardId` no papel de owner (o card do outro lado é o target). */
  listHydratedByOwner(cardId: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.target_card_id`)
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .join('phases', 'phases.id', 'cards.current_phase_id')
      .where(`${TABLE}.owner_card_id`, cardId)
      .select<ConnectedCardRow[]>(
        `${TABLE}.id as card_connection_id`,
        `${TABLE}.pipeline_connection_id`,
        'cards.id as card_id',
        'cards.title',
        'cards.pipeline_id',
        'pipelines.name as pipeline_name',
        'phases.name as phase_name'
      );
  },

  /** Cards conectados a `cardId` no papel de target (o card do outro lado é o owner). */
  listHydratedByTarget(cardId: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.owner_card_id`)
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .join('phases', 'phases.id', 'cards.current_phase_id')
      .where(`${TABLE}.target_card_id`, cardId)
      .select<ConnectedCardRow[]>(
        `${TABLE}.id as card_connection_id`,
        `${TABLE}.pipeline_connection_id`,
        'cards.id as card_id',
        'cards.title',
        'cards.pipeline_id',
        'pipelines.name as pipeline_name',
        'phases.name as phase_name'
      );
  },

  /** Conexões (cruas) em que `cardId` é o owner — usado pra descobrir quais targets checar. */
  listByOwnerCard(cardId: number) {
    return db<CardConnectionRow>(TABLE).where({ owner_card_id: cardId });
  },

  /** Cards do lado target conectados a `ownerCardId` sob uma conexão específica. */
  listTargetsForOwner(pipelineConnectionId: number, ownerCardId: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.target_card_id`)
      .where({ [`${TABLE}.pipeline_connection_id`]: pipelineConnectionId, [`${TABLE}.owner_card_id`]: ownerCardId })
      .select<{ card_id: number; current_phase_id: number }[]>('cards.id as card_id', 'cards.current_phase_id');
  },

  /** Cards do lado owner conectados a `targetCardId` sob uma conexão específica. */
  listOwnersForTarget(pipelineConnectionId: number, targetCardId: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.owner_card_id`)
      .where({ [`${TABLE}.pipeline_connection_id`]: pipelineConnectionId, [`${TABLE}.target_card_id`]: targetCardId })
      .select<{ card_id: number; current_phase_id: number }[]>('cards.id as card_id', 'cards.current_phase_id');
  },
};
