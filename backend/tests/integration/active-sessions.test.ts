import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const TEST_EMAIL = 'zz-sessions-test@perezimoveis.com';
const PASSWORD = 'SenhaSessoes123!';

describe('sessões ativas', () => {
  let userId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [user] = await db('users')
      .insert({
        name: 'ZZ Sessions Test',
        email: TEST_EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await db('users').where({ id: userId }).del();
    }
    await db.destroy();
  });

  it('lista a sessão atual após o login, marcada como is_current', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: PASSWORD })
      .set('User-Agent', 'jest-test-agent/1.0');
    const cookie = login.headers['set-cookie'];

    const res = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const current = res.body.find((s: { is_current: boolean }) => s.is_current);
    expect(current).toBeDefined();
    expect(current.user_agent).toBe('jest-test-agent/1.0');
  });

  it('revoga uma sessão e ela some da lista', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: PASSWORD });

    const before = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    const sessionId = before.body[0].id;

    const revokeRes = await request(app)
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(revokeRes.status).toBe(204);

    const after = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(after.body.some((s: { id: number }) => s.id === sessionId)).toBe(false);
  });

  it('não permite revogar sessão de outro usuário', async () => {
    const otherPasswordHash = await bcrypt.hash('OutraSenha123!', 10);
    const [otherUser] = await db('users')
      .insert({
        name: 'ZZ Other Sessions Test',
        email: 'zz-sessions-other@perezimoveis.com',
        password_hash: otherPasswordHash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');

    try {
      const loginA = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: PASSWORD });
      const sessionsA = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${loginA.body.accessToken}`);
      const sessionAId = sessionsA.body[0].id;

      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'zz-sessions-other@perezimoveis.com', password: 'OutraSenha123!' });

      const revokeRes = await request(app)
        .delete(`/api/v1/auth/sessions/${sessionAId}`)
        .set('Authorization', `Bearer ${loginB.body.accessToken}`);
      expect(revokeRes.status).toBe(404);
    } finally {
      await db('users').where({ id: otherUser.id }).del();
    }
  });
});
