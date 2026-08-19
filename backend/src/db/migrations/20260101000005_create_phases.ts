import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('phases', (table) => {
    table.increments('id').primary();
    table.integer('pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.integer('position').notNullable();
    table.string('color', 20).nullable();
    table.boolean('is_initial').notNullable().defaultTo(false);
    table.boolean('is_final').notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(['pipeline_id', 'position']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('phases');
}
