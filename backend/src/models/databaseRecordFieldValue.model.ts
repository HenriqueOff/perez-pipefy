import { Knex } from 'knex';
import { db } from '../config/db';
import { DatabaseRecordFieldValueRow } from '../types/entities';

const TABLE = 'database_record_field_values';

export const DatabaseRecordFieldValueModel = {
  listByRecord(recordId: number) {
    return db<DatabaseRecordFieldValueRow>(TABLE).where({ record_id: recordId });
  },

  upsert(recordId: number, databaseFieldId: number, value: unknown, trx: Knex.Transaction | Knex = db) {
    return trx<DatabaseRecordFieldValueRow>(TABLE)
      .insert({ record_id: recordId, database_field_id: databaseFieldId, value: JSON.stringify(value) })
      .onConflict(['record_id', 'database_field_id'])
      .merge({ value: JSON.stringify(value), updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },
};
