import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('custom_fields', (table) => {
    table.string('min_view_role', 20).nullable();
    table.string('min_edit_role', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('custom_fields', (table) => {
    table.dropColumn('min_view_role');
    table.dropColumn('min_edit_role');
  });
}
