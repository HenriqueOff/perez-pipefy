import { db } from '../config/db';
import { AutomationRow } from '../types/entities';
import { AutomationActionType, AutomationTriggerType } from '../types/enums';

const TABLE = 'automations';

export const AutomationModel = {
  listByPipeline(pipelineId: number) {
    return db<AutomationRow>(TABLE).where({ pipeline_id: pipelineId }).orderBy('created_at');
  },

  listActiveByTrigger(pipelineId: number, triggerType: AutomationTriggerType) {
    return db<AutomationRow>(TABLE).where({ pipeline_id: pipelineId, trigger_type: triggerType, active: true });
  },

  findById(id: number) {
    return db<AutomationRow>(TABLE).where({ id }).first();
  },

  create(input: {
    pipeline_id: number;
    name: string;
    trigger_type: AutomationTriggerType;
    trigger_config: Record<string, unknown> | null;
    action_type: AutomationActionType;
    action_config: Record<string, unknown> | null;
    active?: boolean;
  }) {
    return db<AutomationRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(
    id: number,
    changes: Partial<
      Pick<AutomationRow, 'name' | 'trigger_config' | 'action_type' | 'action_config' | 'active'>
    >
  ) {
    return db<AutomationRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<AutomationRow>(TABLE).where({ id }).delete();
  },
};
