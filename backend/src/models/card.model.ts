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

  countInPhase(phaseId: number) {
    return db<CardRow>(TABLE).where({ current_phase_id: phaseId }).count<{ count: string }[]>('id as count').first();
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
