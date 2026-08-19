import { db } from '../config/db';
import { PhaseRow } from '../types/entities';

const TABLE = 'phases';

export const PhaseModel = {
  findById(id: number) {
    return db<PhaseRow>(TABLE).where({ id }).first();
  },

  listByPipeline(pipelineId: number) {
    return db<PhaseRow>(TABLE).where({ pipeline_id: pipelineId }).orderBy('position');
  },

  create(input: {
    pipeline_id: number;
    name: string;
    position: number;
    color?: string | null;
    is_initial?: boolean;
    is_final?: boolean;
    sla_hours?: number | null;
    wip_limit?: number | null;
  }) {
    return db<PhaseRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: number,
    changes: Partial<
      Pick<PhaseRow, 'name' | 'position' | 'color' | 'is_initial' | 'is_final' | 'sla_hours' | 'wip_limit'>
    >
  ) {
    return db<PhaseRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<PhaseRow>(TABLE).where({ id }).delete();
  },

  countCards(id: number) {
    return db('cards').where({ current_phase_id: id }).count<{ count: string }[]>('id as count').first();
  },
};
