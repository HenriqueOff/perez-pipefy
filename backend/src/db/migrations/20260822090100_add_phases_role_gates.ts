import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.string('min_move_in_role', 20).nullable();
    table.string('min_move_out_role', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.dropColumn('min_move_in_role');
    table.dropColumn('min_move_out_role');
  });
}
