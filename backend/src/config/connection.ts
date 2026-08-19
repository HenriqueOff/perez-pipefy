import type { Knex } from 'knex';

/**
 * Usada tanto pelo knexfile.ts (CLI de migrations) quanto por config/db.ts (app em
 * runtime), para que os dois nunca divirjam na configuração de SSL. Bancos gerenciados
 * (Supabase, Neon, etc.) exigem SSL; o Postgres local via Docker não usa.
 */
export function buildDatabaseConnection(): Knex.PgConnectionConfig | string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  if (process.env.DATABASE_SSL === 'true') {
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
  return connectionString;
}
