import { db } from '../config/db';
import { DatabaseModel } from '../models/database.model';
import { DatabaseFieldModel } from '../models/databaseField.model';
import { DatabaseRecordModel } from '../models/databaseRecord.model';
import { DatabaseRecordFieldValueModel } from '../models/databaseRecordFieldValue.model';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';
import { requiredFieldsMissing, validateFieldValue } from '../utils/fieldValidation';

async function assertRecordInDatabase(recordId: number, databaseId: number) {
  const record = await DatabaseRecordModel.findById(recordId);
  if (!record || record.database_id !== databaseId) {
    throw AppError.notFound('Registro não encontrado');
  }
  return record;
}

export const DatabaseService = {
  listForUser(userId: number) {
    return DatabaseModel.listForUser(userId);
  },

  async getDetail(databaseId: number) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw AppError.notFound('Database não encontrado');
    }
    const [fields, members] = await Promise.all([
      DatabaseFieldModel.listByDatabase(databaseId),
      DatabaseModel.listMembers(databaseId),
    ]);
    return { ...database, fields, members };
  },

  async create(input: { name: string; description?: string; category?: string; created_by: number }) {
    const database = await DatabaseModel.create({
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      created_by: input.created_by,
    });
    // criador vira owner automaticamente, mesma regra de pipelines
    await DatabaseModel.addMember(database.id, input.created_by, 'owner');
    return database;
  },

  async update(
    databaseId: number,
    changes: { name?: string; description?: string | null; category?: string | null; archived?: boolean }
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw AppError.notFound('Database não encontrado');
    }
    return DatabaseModel.update(databaseId, changes);
  },

  // --- membership ---
  // Adicionar membro sempre passa por requireDatabaseRole('manager') na rota — sem isso,
  // um usuário sem nenhum vínculo não alcança este service. Só admin global tem bypass
  // (permite ele se autoadicionar; ninguém mais consegue), igual à regra de pipelines.

  async addMember(databaseId: number, userId: number, role: PipelineRole) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw AppError.notFound('Database não encontrado');
    }
    return DatabaseModel.addMember(databaseId, userId, role);
  },

  async removeMember(databaseId: number, userId: number) {
    return DatabaseModel.removeMember(databaseId, userId);
  },

  // --- fields ---

  async createField(
    databaseId: number,
    input: { label: string; key: string; type: string; options?: string[]; required?: boolean; position?: number }
  ) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw AppError.notFound('Database não encontrado');
    }
    if (input.type === 'select' && (!input.options || input.options.length === 0)) {
      throw new AppError('Campos do tipo select precisam de ao menos uma opção', 422);
    }
    const existing = await DatabaseFieldModel.listByDatabase(databaseId);
    return DatabaseFieldModel.create({
      database_id: databaseId,
      label: input.label,
      key: input.key,
      type: input.type,
      options: input.options ?? null,
      required: input.required ?? false,
      position: input.position ?? existing.length,
    });
  },

  async updateField(
    fieldId: number,
    databaseId: number,
    changes: { label?: string; options?: string[]; required?: boolean; position?: number }
  ) {
    const field = await DatabaseFieldModel.findById(fieldId);
    if (!field || field.database_id !== databaseId) {
      throw AppError.notFound('Campo não encontrado');
    }
    return DatabaseFieldModel.update(fieldId, changes);
  },

  async deleteField(fieldId: number, databaseId: number) {
    const field = await DatabaseFieldModel.findById(fieldId);
    if (!field || field.database_id !== databaseId) {
      throw AppError.notFound('Campo não encontrado');
    }
    return DatabaseFieldModel.delete(fieldId);
  },

  // --- records ---

  async listRecords(databaseId: number) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw AppError.notFound('Database não encontrado');
    }
    const [records, fields, valueRows] = await Promise.all([
      DatabaseRecordModel.listByDatabase(databaseId),
      DatabaseFieldModel.listByDatabase(databaseId),
      DatabaseRecordFieldValueModel.listByDatabaseRecords(databaseId),
    ]);
    const valuesByRecord = new Map<number, { fieldId: number; value: unknown }[]>();
    for (const v of valueRows) {
      const list = valuesByRecord.get(v.record_id) ?? [];
      list.push({ fieldId: v.database_field_id, value: v.value });
      valuesByRecord.set(v.record_id, list);
    }
    return {
      fields,
      records: records.map((record) => ({ ...record, fieldValues: valuesByRecord.get(record.id) ?? [] })),
    };
  },

  async createRecord(databaseId: number, userId: number, input: { title: string; fields?: Record<string, unknown> }) {
    const database = await DatabaseModel.findById(databaseId);
    if (!database) {
      throw AppError.notFound('Database não encontrado');
    }

    const dbFields = await DatabaseFieldModel.listByDatabase(databaseId);
    const byKey = new Map(dbFields.map((f) => [f.key, f]));

    const valueByFieldId = new Map<number, unknown>();
    for (const [key, value] of Object.entries(input.fields ?? {})) {
      const field = byKey.get(key);
      if (!field) {
        throw new AppError(`Campo "${key}" não existe neste database`, 422);
      }
      validateFieldValue(field, value);
      valueByFieldId.set(field.id, value);
    }

    const missing = requiredFieldsMissing(dbFields, valueByFieldId);
    if (missing.length > 0) {
      throw new AppError(`Preencha os campos obrigatórios: ${missing.map((f) => f.label).join(', ')}`, 422);
    }

    return db.transaction(async (trx) => {
      const { count } = (await trx('database_records').where({ database_id: databaseId }).count<{ count: string }[]>('id as count').first()) ?? {
        count: '0',
      };
      const [created] = await trx('database_records')
        .insert({ database_id: databaseId, title: input.title, created_by: userId, position: Number(count) })
        .returning('*');

      for (const [fieldId, value] of valueByFieldId) {
        await trx('database_record_field_values').insert({
          record_id: created.id,
          database_field_id: fieldId,
          value: JSON.stringify(value),
        });
      }

      return created;
    });
  },

  async updateRecord(recordId: number, databaseId: number, changes: { title?: string }) {
    await assertRecordInDatabase(recordId, databaseId);
    return DatabaseRecordModel.update(recordId, changes);
  },

  async updateRecordFields(recordId: number, databaseId: number, fields: Record<string, unknown>) {
    await assertRecordInDatabase(recordId, databaseId);
    const dbFields = await DatabaseFieldModel.listByDatabase(databaseId);
    const byKey = new Map(dbFields.map((f) => [f.key, f]));

    // A leitura final precisa rodar DEPOIS da transação commitar — chamar o model (que usa
    // a conexão default, não a `trx`) de dentro do callback lia valor desatualizado, já que
    // o UPDATE ainda não tinha sido commitado naquela conexão separada.
    await db.transaction(async (trx) => {
      for (const [key, value] of Object.entries(fields)) {
        const field = byKey.get(key);
        if (!field) {
          throw new AppError(`Campo "${key}" não existe neste database`, 422);
        }
        validateFieldValue(field, value);
        await trx('database_record_field_values')
          .insert({ record_id: recordId, database_field_id: field.id, value: JSON.stringify(value) })
          .onConflict(['record_id', 'database_field_id'])
          .merge({ value: JSON.stringify(value), updated_at: trx.fn.now() });
      }
    });
    return DatabaseRecordFieldValueModel.listByRecord(recordId);
  },

  async deleteRecord(recordId: number, databaseId: number) {
    await assertRecordInDatabase(recordId, databaseId);
    return DatabaseRecordModel.delete(recordId);
  },
};
