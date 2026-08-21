import type { Knex } from 'knex';

/**
 * SLA por card, sobrepondo o SLA padrão da fase (ação de automação "aplique regras de
 * SLA"). É uma propriedade do card, não da fase: continua valendo mesmo que o card
 * mude de fase depois.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.integer('sla_override_hours').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('sla_override_hours');
  });
}
