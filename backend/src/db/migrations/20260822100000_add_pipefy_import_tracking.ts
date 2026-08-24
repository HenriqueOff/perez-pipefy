import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE card_external_refs DROP CONSTRAINT card_external_refs_provider_check`);
  await knex.raw(`ALTER TABLE card_external_refs ADD CONSTRAINT card_external_refs_provider_check CHECK (provider IN ('imoview', 'pipefy'))`);
  await knex.schema.alterTable('card_external_refs', (table) => {
    table.index(['provider', 'external_type', 'external_id'], 'card_external_refs_lookup_idx');
  });

  await knex.schema.alterTable('pipelines', (table) => {
    table.string('pipefy_pipe_id', 50).nullable();
  });
  await knex.schema.alterTable('phases', (table) => {
    table.string('pipefy_phase_id', 50).nullable();
  });
  await knex.schema.alterTable('custom_fields', (table) => {
    table.string('pipefy_field_id', 150).nullable();
  });
  await knex.schema.alterTable('attachments', (table) => {
    table.string('pipefy_attachment_path', 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('attachments', (table) => {
    table.dropColumn('pipefy_attachment_path');
  });
  await knex.schema.alterTable('custom_fields', (table) => {
    table.dropColumn('pipefy_field_id');
  });
  await knex.schema.alterTable('phases', (table) => {
    table.dropColumn('pipefy_phase_id');
  });
  await knex.schema.alterTable('pipelines', (table) => {
    table.dropColumn('pipefy_pipe_id');
  });
  await knex.schema.alterTable('card_external_refs', (table) => {
    table.dropIndex(['provider', 'external_type', 'external_id'], 'card_external_refs_lookup_idx');
  });
  await knex.raw(`ALTER TABLE card_external_refs DROP CONSTRAINT card_external_refs_provider_check`);
  await knex.raw(`ALTER TABLE card_external_refs ADD CONSTRAINT card_external_refs_provider_check CHECK (provider IN ('imoview'))`);
}
