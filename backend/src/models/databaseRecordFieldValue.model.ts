import { Knex } from 'knex';
import { db } from '../config/db';
import { DatabaseRecordFieldValueRow } from '../types/entities';

const TABLE = 'database_record_field_values';

export const DatabaseRecordFieldValueModel = {
  listByRecord(recordId: number) {
    return db<DatabaseRecordFieldValueRow>(TABLE).where({ record_id: recordId });
  },

  // Uma consulta só para todos os registros de um database (agrupar em memória no
  // service), no lugar de um listByRecord por registro.
  listByDatabaseRecords(databaseId: number) {
    return db<DatabaseRecordFieldValueRow>(TABLE)
      .join('database_records', 'database_records.id', 'database_record_field_values.record_id')
      .where('database_records.database_id', databaseId)
      .select('database_record_field_values.*') as Promise<DatabaseRecordFieldValueRow[]>;
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
