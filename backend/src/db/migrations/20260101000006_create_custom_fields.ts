import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('custom_fields', (table) => {
    table.increments('id').primary();
    table.integer('phase_id').notNullable().references('id').inTable('phases').onDelete('CASCADE');
    table.string('label', 150).notNullable();
    table.string('key', 100).notNullable();
    table.enu('type', ['text', 'textarea', 'number', 'date', 'boolean', 'select']).notNullable();
    table.jsonb('options').nullable();
    table.boolean('required').notNullable().defaultTo(false);
    table.integer('position').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.unique(['phase_id', 'key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_fields');
}
