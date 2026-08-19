import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attachments', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('uploaded_by').notNullable().references('id').inTable('users');
    table.string('file_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('mime_type', 150).notNullable();
    table.integer('size').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['card_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attachments');
}
