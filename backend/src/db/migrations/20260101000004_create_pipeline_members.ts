import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pipeline_members', (table) => {
    table.increments('id').primary();
    table.integer('pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enu('pipeline_role', ['manager', 'member']).notNullable().defaultTo('member');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['pipeline_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pipeline_members');
}
