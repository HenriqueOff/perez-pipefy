import { db } from '../config/db';
import { ContractTemplateRow } from '../types/entities';

const TABLE = 'contract_templates';

export const ContractTemplateModel = {
  listByPipeline(pipelineId: number) {
    return db<ContractTemplateRow>(TABLE).where({ pipeline_id: pipelineId }).orderBy('name');
  },

  findById(id: number) {
    return db<ContractTemplateRow>(TABLE).where({ id }).first();
  },

  create(input: { pipeline_id: number; name: string; body_html: string }) {
    return db<ContractTemplateRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<ContractTemplateRow, 'name' | 'body_html'>>) {
    return db<ContractTemplateRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<ContractTemplateRow>(TABLE).where({ id }).delete();
  },
};
