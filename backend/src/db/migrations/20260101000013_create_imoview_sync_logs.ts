import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('imoview_sync_logs', (table) => {
    table.increments('id').primary();
    table
      .integer('integration_config_id')
      .notNullable()
      .references('id')
      .inTable('integration_configs')
      .onDelete('CASCADE');
    table.enu('direction', ['import', 'export']).notNullable();
    table.string('entity_type', 100).notNullable();
    table.string('external_id', 150).nullable();
    table.integer('internal_id').nullable();
    table.enu('status', ['success', 'error']).notNullable();
    table.jsonb('payload').nullable();
    table.text('error_message').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['integration_config_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('imoview_sync_logs');
}
