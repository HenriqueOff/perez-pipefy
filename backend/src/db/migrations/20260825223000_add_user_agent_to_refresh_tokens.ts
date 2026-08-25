import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('refresh_tokens', (table) => {
    // Sem isso, a tela de "sessões ativas" listaria linhas genéricas (só data) — o
    // usuário não teria como saber qual sessão é qual dispositivo antes de revogar.
    table.string('user_agent', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('refresh_tokens', (table) => {
    table.dropColumn('user_agent');
  });
}
