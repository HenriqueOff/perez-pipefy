import type { Knex } from 'knex';
import dotenv from 'dotenv';
import { buildDatabaseConnection } from './src/config/connection';

dotenv.config();

const config: Knex.Config = {
  client: 'pg',
  connection: buildDatabaseConnection(),
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/db/seeds',
    extension: 'ts',
  },
  pool: { min: 2, max: 10 },
};

export default config;
