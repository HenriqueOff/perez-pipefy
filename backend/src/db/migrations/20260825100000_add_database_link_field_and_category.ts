import type { Knex } from 'knex';

/**
 * Duas peças pro pedido "puxar dado do Database dentro de um pipe":
 * 1. `custom_fields.type` ganha 'database_link' — um campo de fase que aponta pra um
 *    Database específico (`linked_database_id`). O valor salvo em card_field_values é o
 *    id do registro escolhido; o preenchimento automático de campos-irmãos com o mesmo
 *    `key` de campos do database vinculado acontece no service, não no schema.
 * 2. `databases.category` — agrupamento livre (texto) pra organizar a aba Databases por
 *    setor (Pessoas, Imóveis, Financeiro...) em vez da grade única e não categorizada.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('databases', (table) => {
    table.string('category', 100).nullable();
  });

  await knex.schema.alterTable('custom_fields', (table) => {
    table.integer('linked_database_id').nullable().references('id').inTable('databases').onDelete('SET NULL');
  });

  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula','database_link'))`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula'))`
  );

  await knex.schema.alterTable('custom_fields', (table) => {
    table.dropColumn('linked_database_id');
  });

  await knex.schema.alterTable('databases', (table) => {
    table.dropColumn('category');
  });
}
