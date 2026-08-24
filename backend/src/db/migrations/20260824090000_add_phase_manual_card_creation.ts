import type { Knex } from 'knex';

/**
 * Em alguns pipes, criar card manualmente numa fase quebra a esteira de automações que
 * alimenta aquela fase sozinha (ex: só entra card ali via automação/formulário externo).
 * Esse toggle é admin-only (ver requireGlobalRole('admin') na rota dedicada) — diferente
 * dos outros campos de fase, que managers/owners do pipeline já podem editar.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.boolean('allow_manual_card_creation').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('phases', (table) => {
    table.dropColumn('allow_manual_card_creation');
  });
}
