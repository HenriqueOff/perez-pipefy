import pino from 'pino';
import { env } from '../config/env';

// Nos testes o log fica silencioso: cada request do supertest gerava dezenas de linhas
// do pino-http, afogando o resultado da suíte. `silent` é reconhecido pelo pino.
const level = env.nodeEnv === 'test' ? 'silent' : env.nodeEnv === 'production' ? 'info' : 'debug';

// O pino-http loga cada request com os headers; sem isto, o `Authorization: Bearer ...`
// e o cookie de sessão apareciam em texto puro no log (visto na auditoria de segurança).
// Caminhos que não existem numa dada linha de log são simplesmente ignorados pelo pino,
// então cobrir tanto o formato do pino-http (req.headers.*) quanto o de eventuais logs
// manuais com objeto de request cru (headers.*) é seguro.
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
];

export const logger = pino({
  level,
  redact: { paths: LOG_REDACT_PATHS, censor: '[Redacted]' },
  transport:
    env.nodeEnv === 'production' || env.nodeEnv === 'test'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});
