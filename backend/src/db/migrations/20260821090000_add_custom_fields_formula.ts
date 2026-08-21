import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('custom_fields', (table) => {
    table.text('formula').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('custom_fields', (table) => {
    table.dropColumn('formula');
  });
}
