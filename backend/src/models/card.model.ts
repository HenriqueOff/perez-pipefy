import { db } from '../config/db';
import { CardRow } from '../types/entities';

const TABLE = 'cards';

export const CardModel = {
  findById(id: number) {
    return db<CardRow>(TABLE).where({ id }).first();
  },

  listByPipeline(pipelineId: number) {
    return db<CardRow>(TABLE).where({ pipeline_id: pipelineId }).orderBy(['current_phase_id', 'position']);
  },

  // Só os ids — usado pelo dashboard agregado pra montar a contagem de responsáveis
  // cruzando várias pipelines sem carregar a linha inteira de cada card.
  listIdsByPipelines(pipelineIds: number[]) {
    if (pipelineIds.length === 0) return Promise.resolve([]);
    return db<CardRow>(TABLE).whereIn('pipeline_id', pipelineIds).pluck('id') as Promise<number[]>;
  },

  countInPhase(phaseId: number) {
    return db<CardRow>(TABLE).where({ current_phase_id: phaseId }).count<{ count: string }[]>('id as count').first();
  },

  /**
   * Contagens por pipeline pra tela inicial: total, atrasados (due_date passado) e SLA
   * estourado (mesma regra de notification.service.ts: sla_override_hours ?? phases.sla_hours).
   */
  aggregateStatsByPipelines(pipelineIds: number[]) {
    if (pipelineIds.length === 0) return Promise.resolve([]);
    return db(TABLE)
      .join('phases', 'phases.id', `${TABLE}.current_phase_id`)
      .whereIn(`${TABLE}.pipeline_id`, pipelineIds)
      .groupBy(`${TABLE}.pipeline_id`)
      .select<{ pipeline_id: number; total: number; overdue: number; sla_breached: number }[]>(
        `${TABLE}.pipeline_id`,
        db.raw('COUNT(*)::int as total'),
        db.raw(`COUNT(*) FILTER (WHERE ${TABLE}.due_date IS NOT NULL AND ${TABLE}.due_date < CURRENT_DATE)::int as overdue`),
        db.raw(
          `COUNT(*) FILTER (
            WHERE COALESCE(${TABLE}.sla_override_hours, phases.sla_hours) IS NOT NULL
              AND now() - ${TABLE}.current_phase_since > (COALESCE(${TABLE}.sla_override_hours, phases.sla_hours) || ' hours')::interval
          )::int as sla_breached`
        )
      );
  },

  create(input: {
    pipeline_id: number;
    current_phase_id: number;
    title: string;
    created_by: number;
    position: number;
    due_date?: string | null;
  }) {
    return db<CardRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: number,
    changes: Partial<
      Pick<
        CardRow,
        'title' | 'due_date' | 'position' | 'current_phase_id' | 'current_phase_since' | 'sla_override_hours'
      >
    >
  ) {
    return db<CardRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<CardRow>(TABLE).where({ id }).delete();
  },
};
