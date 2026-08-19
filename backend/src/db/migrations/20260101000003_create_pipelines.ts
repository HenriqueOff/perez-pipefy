import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pipelines', (table) => {
    table.increments('id').primary();
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.integer('created_by').notNullable().references('id').inTable('users');
    table.boolean('archived').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pipelines');
}
