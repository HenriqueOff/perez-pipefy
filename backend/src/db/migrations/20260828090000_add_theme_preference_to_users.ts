import type { Knex } from 'knex';

/**
 * Preferência de tema (claro/escuro) por conta, não por navegador — cada usuário pode
 * escolher a sua, sem afetar os outros. 'system' é o padrão inicial (segue o SO até o
 * usuário mexer no switch pela primeira vez).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('theme_preference', 10).notNullable().defaultTo('system');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('theme_preference');
  });
}
