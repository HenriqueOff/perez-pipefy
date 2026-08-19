import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.integer('sla_hours').nullable();
  });

  await knex.schema.alterTable('cards', (table) => {
    table.timestamp('current_phase_since').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('current_phase_since');
  });
  await knex.schema.alterTable('phases', (table) => {
    table.dropColumn('sla_hours');
  });
}
