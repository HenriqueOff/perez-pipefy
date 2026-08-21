import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_connections', (table) => {
    table.increments('id').primary();
    table
      .integer('pipeline_connection_id')
      .notNullable()
      .references('id')
      .inTable('pipeline_connections')
      .onDelete('CASCADE');
    table.integer('owner_card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('target_card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['pipeline_connection_id', 'owner_card_id', 'target_card_id']);
    table.index(['owner_card_id']);
    table.index(['target_card_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_connections');
}
