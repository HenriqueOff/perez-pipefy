import { db } from '../config/db';
import { UserRow } from '../types/entities';
import { GlobalRole } from '../types/enums';

const TABLE = 'users';

export interface CreateUserInput {
  name: string;
  email: string;
  password_hash: string;
  global_role?: GlobalRole;
}

export const UserModel = {
  findById(id: number) {
    return db<UserRow>(TABLE).where({ id }).first();
  },

  findByEmail(email: string) {
    return db<UserRow>(TABLE).where({ email }).first();
  },

  list() {
    return db<UserRow>(TABLE).select('id', 'name', 'email', 'global_role', 'active', 'created_at').orderBy('name');
  },

  create(input: CreateUserInput) {
    return db<UserRow>(TABLE)
      .insert({ ...input, global_role: input.global_role ?? 'member' })
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<UserRow, 'name' | 'email' | 'global_role' | 'active'>>) {
    return db<UserRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  updatePassword(id: number, password_hash: string) {
    return db<UserRow>(TABLE).where({ id }).update({ password_hash, updated_at: db.fn.now() });
  },
};
