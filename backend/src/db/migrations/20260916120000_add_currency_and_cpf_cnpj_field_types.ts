import type { Knex } from 'knex';

/**
 * `currency`: número armazenado igual ao tipo 'number' (mesma coluna jsonb em
 * card_field_values/database_record_field_values), só muda a formatação/rótulo no
 * frontend (R$ 1.234,56). `cpf_cnpj`: texto com validação de dígito verificador (ver
 * backend/src/utils/documentValidation.ts), aceita CPF (11 dígitos) ou CNPJ (14).
 *
 * Adicionado em custom_fields (campos de card) E database_fields (campos de
 * database/registro mestre) — os dois tipos fazem sentido nos dois lugares (ex.: CPF
 * do inquilino num card, ou numa base de Proprietários).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link','photo_gallery','phone','currency','cpf_cnpj'))`
  );

  await knex.raw('ALTER TABLE database_fields DROP CONSTRAINT database_fields_type_check');
  await knex.raw(
    `ALTER TABLE database_fields ADD CONSTRAINT database_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','currency','cpf_cnpj'))`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link','photo_gallery','phone'))`
  );

  await knex.raw('ALTER TABLE database_fields DROP CONSTRAINT database_fields_type_check');
  await knex.raw(
    `ALTER TABLE database_fields ADD CONSTRAINT database_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select'))`
  );
}
