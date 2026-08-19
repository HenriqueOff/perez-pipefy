import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_field_values', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('custom_field_id').notNullable().references('id').inTable('custom_fields').onDelete('CASCADE');
    table.jsonb('value').nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['card_id', 'custom_field_id']);
  });

  await knex.raw('CREATE INDEX card_field_values_value_gin_idx ON card_field_values USING GIN (value)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_field_values');
}
