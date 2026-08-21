import type { Knex } from 'knex';

/**
 * Adiciona prazo e observação opcionais a uma atribuição, permitindo que a automação
 * "envie uma tarefa" reaproveite assign_user em vez de criar uma entidade de tarefa nova.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_assignees', (table) => {
    table.date('due_date').nullable();
    table.text('note').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_assignees', (table) => {
    table.dropColumn('due_date');
    table.dropColumn('note');
  });
}
