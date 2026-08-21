import { db } from '../config/db';
import { CustomFieldRow } from '../types/entities';
import { CustomFieldType, PipelineRole } from '../types/enums';

const TABLE = 'custom_fields';

export const CustomFieldModel = {
  findById(id: number) {
    return db<CustomFieldRow>(TABLE).where({ id }).first();
  },

  listByPhase(phaseId: number) {
    return db<CustomFieldRow>(TABLE).where({ phase_id: phaseId }).orderBy('position');
  },

  listByPipeline(pipelineId: number) {
    return db<CustomFieldRow>(TABLE)
      .join('phases', 'phases.id', 'custom_fields.phase_id')
      .where('phases.pipeline_id', pipelineId)
      .select('custom_fields.*')
      .orderBy(['custom_fields.phase_id', 'custom_fields.position']);
  },

  create(input: {
    phase_id: number;
    label: string;
    key: string;
    type: CustomFieldType;
    options?: string[] | null;
    formula?: string | null;
    min_view_role?: PipelineRole | null;
    min_edit_role?: PipelineRole | null;
    required?: boolean;
    position: number;
  }) {
    const payload = { ...input, options: input.options ? JSON.stringify(input.options) : null };
    return db<CustomFieldRow>(TABLE)
      .insert(payload as unknown as CustomFieldRow)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: number,
    changes: Partial<
      Pick<CustomFieldRow, 'label' | 'options' | 'formula' | 'min_view_role' | 'min_edit_role' | 'required' | 'position'>
    >
  ) {
    const payload: Record<string, unknown> = { ...changes, updated_at: db.fn.now() };
    if (changes.options !== undefined) {
      payload.options = changes.options ? JSON.stringify(changes.options) : null;
    }
    return db<CustomFieldRow>(TABLE)
      .where({ id })
      .update(payload as unknown as Partial<CustomFieldRow>)
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<CustomFieldRow>(TABLE).where({ id }).delete();
  },
};
