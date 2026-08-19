import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_history', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users');
    table
      .enu('event_type', ['created', 'moved', 'field_updated', 'assigned', 'comment_added', 'attachment_added'])
      .notNullable();
    table.integer('from_phase_id').nullable().references('id').inTable('phases');
    table.integer('to_phase_id').nullable().references('id').inTable('phases');
    table.integer('field_id').nullable().references('id').inTable('custom_fields');
    table.jsonb('old_value').nullable();
    table.jsonb('new_value').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['card_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_history');
}
