import { db } from '../config/db';
import { PipelineMemberRow, PipelineRow } from '../types/entities';
import { PipelineRole } from '../types/enums';

const TABLE = 'pipelines';
const MEMBERS_TABLE = 'pipeline_members';

// public_form_token concede criação de card sem login: nunca deve ir para respostas
// de listagem/detalhe lidas por qualquer membro do pipe, só pela tela de gestão do form.
const SAFE_COLUMNS = [
  'id',
  'name',
  'description',
  'created_by',
  'archived',
  'public_form_enabled',
  'created_at',
  'updated_at',
] as const;

export const PipelineModel = {
  findById(id: number) {
    return db<PipelineRow>(TABLE).where({ id }).first();
  },

  findSafeById(id: number) {
    return db<PipelineRow>(TABLE).where({ id }).select(...SAFE_COLUMNS).first();
  },

  findByPublicFormToken(token: string) {
    return db<PipelineRow>(TABLE).where({ public_form_token: token, public_form_enabled: true, archived: false }).first();
  },

  listForUser(userId: number, isAdmin: boolean) {
    const query = db<PipelineRow>(TABLE).where({ archived: false }).select(...SAFE_COLUMNS).orderBy('name');
    if (isAdmin) {
      return query;
    }
    return query.whereIn('id', db(MEMBERS_TABLE).select('pipeline_id').where({ user_id: userId }));
  },

  setPublicForm(id: number, changes: { public_form_token?: string; public_form_enabled: boolean }) {
    return db<PipelineRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  create(input: { name: string; description?: string | null; created_by: number }) {
    return db<PipelineRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<PipelineRow, 'name' | 'description' | 'archived'>>) {
    return db<PipelineRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  // --- membership ---

  listMembers(pipelineId: number) {
    return db<PipelineMemberRow>(MEMBERS_TABLE)
      .join('users', 'users.id', 'pipeline_members.user_id')
      .where({ pipeline_id: pipelineId })
      .select('pipeline_members.id', 'pipeline_members.pipeline_role', 'users.id as user_id', 'users.name', 'users.email');
  },

  findMembership(pipelineId: number, userId: number) {
    return db<PipelineMemberRow>(MEMBERS_TABLE).where({ pipeline_id: pipelineId, user_id: userId }).first();
  },

  addMember(pipelineId: number, userId: number, role: PipelineRole) {
    return db<PipelineMemberRow>(MEMBERS_TABLE)
      .insert({ pipeline_id: pipelineId, user_id: userId, pipeline_role: role })
      .onConflict(['pipeline_id', 'user_id'])
      .merge({ pipeline_role: role })
      .returning('*')
      .then((rows) => rows[0]);
  },

  removeMember(pipelineId: number, userId: number) {
    return db<PipelineMemberRow>(MEMBERS_TABLE).where({ pipeline_id: pipelineId, user_id: userId }).delete();
  },
};
