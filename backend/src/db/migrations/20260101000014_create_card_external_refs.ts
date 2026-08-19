import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_external_refs', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.enu('provider', ['imoview']).notNullable();
    table.string('external_id', 150).notNullable();
    table.string('external_type', 100).notNullable();
    table.timestamp('last_synced_at').nullable();
    table.unique(['card_id', 'provider', 'external_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_external_refs');
}
