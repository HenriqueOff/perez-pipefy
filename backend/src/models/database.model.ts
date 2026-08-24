import { db } from '../config/db';
import { DatabaseMemberRow, DatabaseRow } from '../types/entities';
import { PipelineRole } from '../types/enums';

const TABLE = 'databases';
const MEMBERS_TABLE = 'database_members';

export const DatabaseModel = {
  findById(id: number) {
    return db<DatabaseRow>(TABLE).where({ id }).first();
  },

  // Nunca com bypass de admin: diferente de pipelines, a listagem de databases sempre
  // reflete só o que o usuário foi de fato adicionado como membro (ver observação do
  // pedido original — visibilidade não é a mesma coisa que permissão de gestão).
  listForUser(userId: number) {
    return db<DatabaseRow>(TABLE)
      .where({ archived: false })
      .whereIn('id', db(MEMBERS_TABLE).select('database_id').where({ user_id: userId }))
      .orderBy('name');
  },

  create(input: { name: string; description?: string | null; created_by: number }) {
    return db<DatabaseRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<DatabaseRow, 'name' | 'description' | 'archived'>>) {
    return db<DatabaseRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  // --- membership ---

  listMembers(databaseId: number) {
    return db<DatabaseMemberRow>(MEMBERS_TABLE)
      .join('users', 'users.id', 'database_members.user_id')
      .where({ database_id: databaseId })
      .select('database_members.id', 'database_members.database_role', 'users.id as user_id', 'users.name', 'users.email');
  },

  findMembership(databaseId: number, userId: number) {
    return db<DatabaseMemberRow>(MEMBERS_TABLE).where({ database_id: databaseId, user_id: userId }).first();
  },

  addMember(databaseId: number, userId: number, role: PipelineRole) {
    return db<DatabaseMemberRow>(MEMBERS_TABLE)
      .insert({ database_id: databaseId, user_id: userId, database_role: role })
      .onConflict(['database_id', 'user_id'])
      .merge({ database_role: role })
      .returning('*')
      .then((rows) => rows[0]);
  },

  removeMember(databaseId: number, userId: number) {
    return db<DatabaseMemberRow>(MEMBERS_TABLE).where({ database_id: databaseId, user_id: userId }).delete();
  },
};
