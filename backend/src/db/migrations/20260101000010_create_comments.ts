import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users');
    table.text('body').notNullable();
    table.timestamps(true, true);
    table.index(['card_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comments');
}
