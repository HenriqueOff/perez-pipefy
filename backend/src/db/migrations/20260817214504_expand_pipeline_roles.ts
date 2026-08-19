import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pipeline_members', (table) => {
    table.dropColumn('pipeline_role');
  });

  await knex.schema.alterTable('pipeline_members', (table) => {
    table.enum('pipeline_role', ['owner', 'manager', 'editor', 'viewer']).notNullable().defaultTo('viewer');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('pipeline_members', (table) => {
    table.dropColumn('pipeline_role');
  });

  await knex.schema.alterTable('pipeline_members', (table) => {
    table.enum('pipeline_role', ['manager', 'member']).notNullable().defaultTo('member');
  });
}

