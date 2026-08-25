import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1', routes);

  // Sem isso, rota inexistente cai no 404 padrão do Express — página HTML genérica em
  // vez do formato JSON usado no resto da API (inconsistente e confirma o framework por
  // trás pra quem estiver reconhecendo a aplicação).
  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use(errorHandler);

  return app;
}
