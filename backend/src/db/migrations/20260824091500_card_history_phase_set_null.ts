import type { Knex } from 'knex';

/**
 * Mesmo problema já corrigido para field_id em 20260818100000: sem ON DELETE SET NULL,
 * excluir uma fase que já apareceu em algum from_phase_id/to_phase_id do histórico falha
 * com violação de FK, mesmo que a fase esteja vazia hoje (PipelineService.deletePhase só
 * confere cards atuais, não histórico). O histórico deve sobreviver à exclusão da fase,
 * só perdendo a referência.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_history', (table) => {
    table.dropForeign('from_phase_id');
    table.dropForeign('to_phase_id');
  });
  await knex.schema.alterTable('card_history', (table) => {
    table.foreign('from_phase_id').references('id').inTable('phases').onDelete('SET NULL');
    table.foreign('to_phase_id').references('id').inTable('phases').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_history', (table) => {
    table.dropForeign('from_phase_id');
    table.dropForeign('to_phase_id');
  });
  await knex.schema.alterTable('card_history', (table) => {
    table.foreign('from_phase_id').references('id').inTable('phases');
    table.foreign('to_phase_id').references('id').inTable('phases');
  });
}
