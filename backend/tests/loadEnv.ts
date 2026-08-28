import path from 'node:path';
import dotenv from 'dotenv';
import { assertTestEnv } from './assertTestEnv';

/**
 * setupFiles do jest: roda uma vez por arquivo de teste, ANTES de qualquer import do
 * código da aplicação (portanto antes de src/config/env.ts chamar dotenv.config()).
 * Como o dotenv não sobrescreve variáveis já definidas, carregar o .env.test aqui
 * garante que o app inteiro enxergue o ambiente de teste, e não o backend/.env real.
 */
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

assertTestEnv();
