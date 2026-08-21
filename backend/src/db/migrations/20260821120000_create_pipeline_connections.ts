import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pipeline_connections', (table) => {
    table.increments('id').primary();
    table.integer('owner_pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.integer('target_pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['owner_pipeline_id']);
    table.index(['target_pipeline_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pipeline_connections');
}
