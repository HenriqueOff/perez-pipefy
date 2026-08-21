import type { Knex } from 'knex';

/**
 * A migration original de custom_fields criou `type` como enum via CHECK constraint
 * (table.enu do knex no Postgres não usa um tipo nativo por padrão). Adicionar 'formula'
 * ao union do TypeScript não altera essa constraint no banco — precisa recriá-la.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select','formula'))`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE custom_fields DROP CONSTRAINT custom_fields_type_check');
  await knex.raw(
    `ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_type_check CHECK (type IN ('text','textarea','number','date','boolean','select'))`
  );
}
