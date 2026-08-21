import type { Knex } from 'knex';

/**
 * Automações disparadas por um scan em segundo plano (ex.: SLA estourado) não têm um
 * usuário humano por trás. card_history.user_id passa a aceitar NULL para representar
 * esses eventos de origem "sistema" (ver AutomationService.runTriggers).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_history', (table) => {
    table.integer('user_id').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DELETE FROM card_history WHERE user_id IS NULL');
  await knex.schema.alterTable('card_history', (table) => {
    table.integer('user_id').notNullable().alter();
  });
}
