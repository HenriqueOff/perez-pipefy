import request from 'supertest';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';
import { SCAN_ADVISORY_LOCK_KEY } from '../../src/services/scan.service';

const app = createApp();

// INTERNAL_API_SECRET vem de backend/.env.test
const SECRET = 'test-internal-secret';

describe('endpoint interno de scans periódicos', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('recusa sem o cabeçalho de segredo', async () => {
    const res = await request(app).post('/api/v1/internal/run-scans');
    expect(res.status).toBe(401);
  });

  it('recusa com segredo errado', async () => {
    const res = await request(app)
      .post('/api/v1/internal/run-scans')
      .set('X-Internal-Secret', 'errado');
    expect(res.status).toBe(401);
  });

  it('roda os scans com o segredo correto', async () => {
    const res = await request(app).post('/api/v1/internal/run-scans').set('X-Internal-Secret', SECRET);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, ran: true });
  });

  it('pula quando outra instância já está rodando (advisory lock) e volta a rodar depois', async () => {
    await db.transaction(async (trx) => {
      const held = await trx.raw<{ rows: { locked: boolean }[] }>(
        'select pg_try_advisory_xact_lock(?) as locked',
        [SCAN_ADVISORY_LOCK_KEY]
      );
      expect(held.rows[0].locked).toBe(true);

      const res = await request(app).post('/api/v1/internal/run-scans').set('X-Internal-Secret', SECRET);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, ran: false });
    });

    // lock liberado no commit da transação acima
    const after = await request(app).post('/api/v1/internal/run-scans').set('X-Internal-Secret', SECRET);
    expect(after.body).toEqual({ ok: true, ran: true });
  });
});
