import type { Knex } from 'knex';

/**
 * Sem isso, excluir um campo customizado que já tem entradas de histórico (ex.: um
 * field_updated) falha com violação de FK em vez de retornar 204 — o histórico deve
 * sobreviver à exclusão do campo, só perdendo a referência.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_history', (table) => {
    table.dropForeign('field_id');
  });
  await knex.schema.alterTable('card_history', (table) => {
    table.foreign('field_id').references('id').inTable('custom_fields').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_history', (table) => {
    table.dropForeign('field_id');
  });
  await knex.schema.alterTable('card_history', (table) => {
    table.foreign('field_id').references('id').inTable('custom_fields');
  });
}
