import type { Knex } from 'knex';

/**
 * 2FA opcional via TOTP (compatível com Google Authenticator/Authy). O secret fica
 * cifrado em repouso com a mesma chave (`CREDENTIALS_ENCRYPTION_KEY`) já usada pras
 * credenciais de integração — só é decifrado na hora de gerar/validar um código.
 * `totp_enabled` só vira true depois que o usuário confirma um código válido no setup;
 * até lá o secret gerado fica "pendente" e não é usado no login.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.text('totp_secret_encrypted').nullable();
    table.boolean('totp_enabled').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('totp_secret_encrypted');
    table.dropColumn('totp_enabled');
  });
}
