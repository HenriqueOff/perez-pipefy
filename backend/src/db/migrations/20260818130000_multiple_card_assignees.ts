import type { Knex } from 'knex';

/**
 * Substitui o responsável único (cards.assignee_id) por uma tabela pivô, permitindo
 * vários responsáveis por card (como no Pipefy). Os dados existentes são migrados
 * para a nova tabela antes da coluna antiga ser removida.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_assignees', (table) => {
    table.increments('id').primary();
    table.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['card_id', 'user_id']);
    table.index(['card_id']);
  });

  await knex.raw(`
    INSERT INTO card_assignees (card_id, user_id)
    SELECT id, assignee_id FROM cards WHERE assignee_id IS NOT NULL
  `);

  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('assignee_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.integer('assignee_id').nullable().references('id').inTable('users');
  });

  await knex.raw(`
    UPDATE cards
    SET assignee_id = first_assignee.user_id
    FROM (
      SELECT DISTINCT ON (card_id) card_id, user_id
      FROM card_assignees
      ORDER BY card_id, created_at ASC
    ) AS first_assignee
    WHERE cards.id = first_assignee.card_id
  `);

  await knex.schema.dropTableIfExists('card_assignees');
}
