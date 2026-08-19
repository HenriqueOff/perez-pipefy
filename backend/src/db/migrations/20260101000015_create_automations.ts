import type { Knex } from 'knex';

/**
 * Schema reservado para v2 - motor de automações ("quando X, fazer Y").
 * Não há executor implementado no MVP; a tabela existe apenas para evitar
 * uma migração de dados retroativa quando a feature for construída.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('automations', (table) => {
    table.increments('id').primary();
    table.integer('pipeline_id').notNullable().references('id').inTable('pipelines').onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.string('trigger_type', 100).notNullable();
    table.jsonb('trigger_config').nullable();
    table.string('action_type', 100).notNullable();
    table.jsonb('action_config').nullable();
    table.boolean('active').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('automations');
}
