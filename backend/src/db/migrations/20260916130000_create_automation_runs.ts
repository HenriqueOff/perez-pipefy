import type { Knex } from 'knex';

/**
 * Histórico de execução de automações: hoje uma automação que falha só aparece nos logs
 * do processo (pino, via `docker compose logs`) — ninguém percebe sem estar olhando o
 * terminal do servidor no momento exato. Esta tabela grava toda execução (sucesso ou
 * erro) pra virar uma aba visível em AutomationsModal.tsx.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('automation_runs', (table) => {
    table.increments('id').primary();
    table.integer('automation_id').notNullable().references('id').inTable('automations').onDelete('CASCADE');
    // SET NULL, não CASCADE: o card pode ser apagado depois, mas o histórico da
    // automação continua fazendo sentido sem ele (mostra "card removido").
    table.integer('card_id').nullable().references('id').inTable('cards').onDelete('SET NULL');
    table.enu('status', ['success', 'error']).notNullable();
    table.text('error_message').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['automation_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('automation_runs');
}
