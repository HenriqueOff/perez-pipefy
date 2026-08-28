import request from 'supertest';
import pino from 'pino';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';
import { LOG_REDACT_PATHS } from '../../src/utils/logger';

const app = createApp();

describe('/health e redação de log', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('GET /health toca o banco e responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('o redact do logger esconde Authorization e cookies', () => {
    const captured: string[] = [];
    const stream: pino.DestinationStream = {
      write: (chunk: string) => {
        captured.push(chunk);
      },
    };
    const l = pino({ redact: { paths: LOG_REDACT_PATHS, censor: '[Redacted]' } }, stream);

    l.info(
      {
        req: {
          method: 'GET',
          url: '/api/v1/pipelines',
          headers: { authorization: 'Bearer super-secret-token', cookie: 'refreshToken=abc123' },
        },
        res: { headers: { 'set-cookie': 'refreshToken=xyz789; HttpOnly' } },
      },
      'request completed'
    );

    const line = captured.join('');
    expect(line).not.toContain('super-secret-token');
    expect(line).not.toContain('abc123');
    expect(line).not.toContain('xyz789');
    expect(line).toContain('[Redacted]');
  });
});
