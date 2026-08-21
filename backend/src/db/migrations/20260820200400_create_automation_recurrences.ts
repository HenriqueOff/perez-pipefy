import type { Knex } from 'knex';

/**
 * Estado interno do agendador da automação "atividade recorrente": guarda o último
 * disparo por (automação, card) para o scan periódico decidir se já passou o
 * intervalo configurado.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('automation_recurrences', (table) => {
    table.increments('id').primary();
    table.integer('automation_id').notNullable().references('id').inTable('automations').onDelete('CASCADE');
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.timestamp('last_fired_at').notNullable();
    table.unique(['automation_id', 'card_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('automation_recurrences');
}
