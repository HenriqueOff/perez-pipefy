import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const TEST_EMAIL = 'zz-force-password-test@perezimoveis.com';
const OLD_PASSWORD = 'SenhaProvisoria123!';
const NEW_PASSWORD = 'SenhaNovaEscolhida456!';

describe('troca de senha obrigatória', () => {
  let userId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(OLD_PASSWORD, 10);
    const [user] = await db('users')
      .insert({
        name: 'ZZ Force Password Test',
        email: TEST_EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: true,
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

  it('login retorna must_change_password: true', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: OLD_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.must_change_password).toBe(true);
  });

  it('bloqueia uma rota qualquer com 403 enquanto a senha não é trocada', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: OLD_PASSWORD });
    const res = await request(app).get('/api/v1/pipelines').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.details?.code).toBe('MUST_CHANGE_PASSWORD');
  });

  it('permite acessar /auth/me mesmo com troca pendente', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: OLD_PASSWORD });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
  });

  it('troca a senha e libera o acesso com o token novo', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: OLD_PASSWORD });

    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.accessToken).toBeDefined();

    const pipelinesRes = await request(app)
      .get('/api/v1/pipelines')
      .set('Authorization', `Bearer ${changeRes.body.accessToken}`);
    expect(pipelinesRes.status).toBe(200);
  });

  it('login seguinte com a senha nova já vem com must_change_password: false', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: TEST_EMAIL, password: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.must_change_password).toBe(false);
  });
});
