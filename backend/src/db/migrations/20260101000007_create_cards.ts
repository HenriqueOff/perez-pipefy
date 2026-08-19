import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cards', (table) => {
    table.increments('id').primary();
    table.integer('pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.integer('current_phase_id').notNullable().references('id').inTable('phases');
    table.string('title', 255).notNullable();
    table.integer('created_by').notNullable().references('id').inTable('users');
    table.integer('assignee_id').nullable().references('id').inTable('users');
    table.integer('position').notNullable().defaultTo(0);
    table.date('due_date').nullable();
    table.timestamps(true, true);
    table.index(['pipeline_id', 'current_phase_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cards');
}
