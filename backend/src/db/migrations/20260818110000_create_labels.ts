import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('labels', (table) => {
    table.increments('id').primary();
    table.integer('pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('color', 20).notNullable().defaultTo('#6b7280');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['pipeline_id', 'name']);
  });

  await knex.schema.createTable('card_labels', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('label_id').notNullable().references('id').inTable('labels').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['card_id', 'label_id']);
    table.index(['card_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_labels');
  await knex.schema.dropTableIfExists('labels');
}
