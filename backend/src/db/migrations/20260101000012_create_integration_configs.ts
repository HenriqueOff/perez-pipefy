import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('integration_configs', (table) => {
    table.increments('id').primary();
    table.enu('provider', ['imoview']).notNullable();
    table.string('base_url', 500).notNullable();
    table.text('credentials_encrypted').notNullable();
    table.jsonb('config').nullable();
    table.integer('created_by').notNullable().references('id').inTable('users');
    table.timestamps(true, true);
    table.unique(['provider']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('integration_configs');
}
