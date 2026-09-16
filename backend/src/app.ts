import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { db } from './config/db';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';

// process.cwd() é a pasta do workspace "backend" tanto em dev (ts-node-dev,
// "npm run dev --workspace backend") quanto em produção (build + "npm start
// --workspace backend") — o npm sempre roda o script com o cwd do workspace.
// Usado no deploy intranet (Docker single-container): backend e frontend são
// buildados juntos e o backend serve o build estático do frontend. Não existe
// no deploy Render (backend e frontend são serviços separados lá), por isso o
// existsSync abaixo.
const FRONTEND_DIST_PATH = process.env.FRONTEND_DIST_PATH ?? path.resolve(process.cwd(), '../frontend/dist');

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // Toca o banco de verdade: um `select 1`. Sem isso, o /health respondia "ok" mesmo com
  // o Postgres fora, e um monitor externo não detectava a queda.
  app.get('/health', async (_req, res) => {
    try {
      await db.raw('select 1');
      res.json({ status: 'ok' });
    } catch (err) {
      logger.error({ err }, 'Health check falhou: banco inacessível');
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  app.use('/api/v1', routes);

  const frontendBuildExists = fs.existsSync(path.join(FRONTEND_DIST_PATH, 'index.html'));

  if (frontendBuildExists) {
    app.use(express.static(FRONTEND_DIST_PATH));
  }

  // Sem isso, rota inexistente cai no 404 padrão do Express — página HTML genérica em
  // vez do formato JSON usado no resto da API (inconsistente e confirma o framework por
  // trás pra quem estiver reconhecendo a aplicação).
  app.use((req, res) => {
    // Rotas de API inexistentes continuam JSON. Qualquer outra coisa (rotas do
    // React Router, ex. /boards/42) cai no index.html do SPA quando o build do
    // frontend está presente (deploy intranet); sem build (deploy Render, onde
    // o frontend é um serviço estático separado), continua JSON 404.
    if (frontendBuildExists && req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND_DIST_PATH, 'index.html'));
      return;
    }
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use(errorHandler);

  return app;
}
