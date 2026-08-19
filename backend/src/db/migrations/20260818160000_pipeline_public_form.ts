import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pipelines', (table) => {
    table.string('public_form_token', 64).nullable().unique();
    table.boolean('public_form_enabled').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pipelines', (table) => {
    table.dropColumn('public_form_enabled');
    table.dropColumn('public_form_token');
  });
}
