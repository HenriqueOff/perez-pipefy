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

  /** Feed simples de atividade recente pra tela inicial, cruzando várias pipelines. */
  listRecentForPipelines(pipelineIds: number[], limit: number) {
    if (pipelineIds.length === 0) return Promise.resolve([]);
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.card_id`)
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .whereIn('cards.pipeline_id', pipelineIds)
      .andWhere('pipelines.archived', false)
      .orderBy(`${TABLE}.created_at`, 'desc')
      .limit(limit)
      .select<
        {
          id: number;
          event_type: CardHistoryEventType;
          created_at: Date;
          card_id: number;
          card_title: string;
          pipeline_id: number;
          pipeline_name: string;
          user_name: string | null;
        }[]
      >(
        `${TABLE}.id`,
        `${TABLE}.event_type`,
        `${TABLE}.created_at`,
        'cards.id as card_id',
        'cards.title as card_title',
        'cards.pipeline_id',
        'pipelines.name as pipeline_name',
        'users.name as user_name'
      );
  },

  /** Feed global de atividade, sem filtro de membership — admin-only (aba "Atividade
   * recente" na home), mesmo formato de listRecentForPipelines mas cruzando todas as
   * pipelines do sistema, não só as do usuário logado. */
  listAllRecent(limit: number, offset: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.card_id`)
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .orderBy(`${TABLE}.created_at`, 'desc')
      .limit(limit)
      .offset(offset)
      .select<
        {
          id: number;
          event_type: CardHistoryEventType;
          created_at: Date;
          card_id: number;
          card_title: string;
          pipeline_id: number;
          pipeline_name: string;
          user_name: string | null;
        }[]
      >(
        `${TABLE}.id`,
        `${TABLE}.event_type`,
        `${TABLE}.created_at`,
        'cards.id as card_id',
        'cards.title as card_title',
        'cards.pipeline_id',
        'pipelines.name as pipeline_name',
        'users.name as user_name'
      );
  },

  /** Feed de auditoria de um único pipeline — mesmo formato de listRecentForPipelines,
   * usado no painel admin-only do pipe (engrenagem no board), paginado. */
  listByPipeline(pipelineId: number, limit: number, offset: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.card_id`)
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .where('cards.pipeline_id', pipelineId)
      .orderBy(`${TABLE}.created_at`, 'desc')
      .limit(limit)
      .offset(offset)
      .select<
        {
          id: number;
          event_type: CardHistoryEventType;
          created_at: Date;
          card_id: number;
          card_title: string;
          user_name: string | null;
        }[]
      >(`${TABLE}.id`, `${TABLE}.event_type`, `${TABLE}.created_at`, 'cards.id as card_id', 'cards.title as card_title', 'users.name as user_name');
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
