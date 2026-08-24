import { db } from '../config/db';
import { DatabaseRecordRow } from '../types/entities';

const TABLE = 'database_records';

export const DatabaseRecordModel = {
  findById(id: number) {
    return db<DatabaseRecordRow>(TABLE).where({ id }).first();
  },

  listByDatabase(databaseId: number) {
    return db<DatabaseRecordRow>(TABLE).where({ database_id: databaseId }).orderBy('position');
  },

  countInDatabase(databaseId: number) {
    return db<DatabaseRecordRow>(TABLE).where({ database_id: databaseId }).count<{ count: string }[]>('id as count').first();
  },

  create(input: { database_id: number; title: string; created_by: number; position: number }) {
    return db<DatabaseRecordRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: { title?: string }) {
    return db<DatabaseRecordRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<DatabaseRecordRow>(TABLE).where({ id }).delete();
  },
};
