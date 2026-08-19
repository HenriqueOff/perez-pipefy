import knex from 'knex';
import { types } from 'pg';
import knexConfig from '../../knexfile';

// mantém colunas DATE como string simples (YYYY-MM-DD), evitando o parser
// padrão do node-postgres que as converte para Date (com pegadinhas de fuso horário)
types.setTypeParser(1082, (value: string) => value);

// knexConfig já resolve a connection (com SSL quando DATABASE_SSL=true) via
// buildDatabaseConnection() — reaproveita para não divergir da config usada pela CLI.
export const db = knex(knexConfig);
