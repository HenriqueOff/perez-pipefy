import type { Knex } from 'knex';

/**
 * "Databases" é um conteúdo irmão de "Pipelines" (mesmo conceito do Pipefy real): uma
 * tabela de registros sem fases/kanban, com campos customizáveis. Estrutura espelha
 * pipelines/pipeline_members/custom_fields/cards/card_field_values de propósito, pra
 * reaproveitar os mesmos padrões de permissão (papel por membro) e edição de campo já
 * validados no resto do app.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('databases', (table) => {
    table.increments('id').primary();
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.integer('created_by').notNullable().references('id').inTable('users');
    table.boolean('archived').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('database_members', (table) => {
    table.increments('id').primary();
    table.integer('database_id').notNullable().references('id').inTable('databases').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enu('database_role', ['owner', 'manager', 'editor', 'viewer']).notNullable().defaultTo('viewer');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['database_id', 'user_id']);
  });

  await knex.schema.createTable('database_fields', (table) => {
    table.increments('id').primary();
    table.integer('database_id').notNullable().references('id').inTable('databases').onDelete('CASCADE');
    table.string('label', 150).notNullable();
    table.string('key', 100).notNullable();
    table.enu('type', ['text', 'textarea', 'number', 'date', 'boolean', 'select']).notNullable();
    table.jsonb('options').nullable();
    table.boolean('required').notNullable().defaultTo(false);
    table.integer('position').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.unique(['database_id', 'key']);
  });

  await knex.schema.createTable('database_records', (table) => {
    table.increments('id').primary();
    table.integer('database_id').notNullable().references('id').inTable('databases').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.integer('created_by').notNullable().references('id').inTable('users');
    table.integer('position').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.index(['database_id']);
  });

  await knex.schema.createTable('database_record_field_values', (table) => {
    table.increments('id').primary();
    table.integer('record_id').notNullable().references('id').inTable('database_records').onDelete('CASCADE');
    table.integer('database_field_id').notNullable().references('id').inTable('database_fields').onDelete('CASCADE');
    table.jsonb('value').nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['record_id', 'database_field_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('database_record_field_values');
  await knex.schema.dropTableIfExists('database_records');
  await knex.schema.dropTableIfExists('database_fields');
  await knex.schema.dropTableIfExists('database_members');
  await knex.schema.dropTableIfExists('databases');
}
