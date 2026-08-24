import { db } from '../config/db';
import { DatabaseFieldRow } from '../types/entities';

const TABLE = 'database_fields';

export const DatabaseFieldModel = {
  findById(id: number) {
    return db<DatabaseFieldRow>(TABLE).where({ id }).first();
  },

  listByDatabase(databaseId: number) {
    return db<DatabaseFieldRow>(TABLE).where({ database_id: databaseId }).orderBy('position');
  },

  create(input: {
    database_id: number;
    label: string;
    key: string;
    type: string;
    options?: string[] | null;
    required?: boolean;
    position: number;
  }) {
    return db<DatabaseFieldRow>(TABLE)
      .insert(input as never)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<DatabaseFieldRow, 'label' | 'options' | 'required' | 'position'>>) {
    return db<DatabaseFieldRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<DatabaseFieldRow>(TABLE).where({ id }).delete();
  },
};
