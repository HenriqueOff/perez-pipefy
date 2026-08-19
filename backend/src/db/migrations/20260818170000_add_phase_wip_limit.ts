import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.integer('wip_limit').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.dropColumn('wip_limit');
  });
}
