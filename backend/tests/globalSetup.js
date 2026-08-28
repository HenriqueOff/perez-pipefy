// globalSetup do jest: roda UMA vez antes de toda a suíte.
// Escrito em JS puro (sem ts-jest) de propósito — o globalSetup não passa pelo transform
// dos testes. Registra o ts-node só para conseguir carregar os utilitários .ts e as
// migrations .ts programaticamente.
const path = require('node:path');

require('ts-node/register/transpile-only');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const knex = require('knex');
const { assertTestEnv } = require('./assertTestEnv');

async function ensureTestDatabase(connectionString) {
  const target = new URL(connectionString);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));

  // Conecta no banco "postgres" (sempre existe) só para criar o banco de teste se ainda
  // não houver — deixa a suíte "turnkey" contra o container do docker-compose, que só
  // cria o banco "pipelines" por padrão.
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';
  const admin = knex({ client: 'pg', connection: adminUrl.toString() });
  try {
    const { rows } = await admin.raw('select 1 from pg_database where datname = ?', [dbName]);
    if (rows.length === 0) {
      await admin.raw('create database ' + admin.ref(dbName).toString());
      // eslint-disable-next-line no-console
      console.log(`[testes] banco "${dbName}" criado.`);
    }
  } finally {
    await admin.destroy();
  }
}

module.exports = async function globalSetup() {
  assertTestEnv();

  const connectionString = process.env.DATABASE_URL;
  await ensureTestDatabase(connectionString);

  const migrator = knex({
    client: 'pg',
    connection: connectionString,
    migrations: {
      directory: path.resolve(__dirname, '../src/db/migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  });
  try {
    const [, applied] = await migrator.migrate.latest();
    if (applied.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[testes] ${applied.length} migration(s) aplicada(s) no banco de teste.`);
    }
  } finally {
    await migrator.destroy();
  }
};
