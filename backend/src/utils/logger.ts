import pino from 'pino';
import { env } from '../config/env';

// Nos testes o log fica silencioso: cada request do supertest gerava dezenas de linhas
// do pino-http, afogando o resultado da suíte. `silent` é reconhecido pelo pino.
const level = env.nodeEnv === 'test' ? 'silent' : env.nodeEnv === 'production' ? 'info' : 'debug';

export const logger = pino({
  level,
  transport:
    env.nodeEnv === 'production' || env.nodeEnv === 'test'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});
