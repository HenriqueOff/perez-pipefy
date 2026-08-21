import { db } from '../config/db';
import { EmailTemplateRow } from '../types/entities';

const TABLE = 'email_templates';

export const EmailTemplateModel = {
  listByPipeline(pipelineId: number) {
    return db<EmailTemplateRow>(TABLE).where({ pipeline_id: pipelineId }).orderBy('name');
  },

  findById(id: number) {
    return db<EmailTemplateRow>(TABLE).where({ id }).first();
  },

  create(input: { pipeline_id: number; name: string; subject: string; body_html: string }) {
    return db<EmailTemplateRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<EmailTemplateRow, 'name' | 'subject' | 'body_html'>>) {
    return db<EmailTemplateRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<EmailTemplateRow>(TABLE).where({ id }).delete();
  },
};
