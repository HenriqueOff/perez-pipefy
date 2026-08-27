import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const EMAIL = 'zz-theme-test@perezimoveis.com';
const PASSWORD = 'SenhaTema123!';

describe('preferência de tema (claro/escuro) por conta', () => {
  let userId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [user] = await db('users')
      .insert({
        name: 'ZZ Theme Test',
        email: EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    userId = user.id;
  });

  afterAll(async () => {
    await db('users').where({ id: userId }).del();
    await db.destroy();
  });

  it('começa como "system" por padrão', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(login.body.user.theme_preference).toBe('system');
  });

  it('recusa um valor de tema inválido', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    const res = await request(app)
      .patch('/api/v1/auth/theme')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ theme_preference: 'roxo' });
    expect(res.status).toBe(422);
  });

  it('salva a escolha e ela persiste entre sessões (é da conta, não do navegador)', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });

    const update = await request(app)
      .patch('/api/v1/auth/theme')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ theme_preference: 'dark' });
    expect(update.status).toBe(200);
    expect(update.body.theme_preference).toBe('dark');

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.body.theme_preference).toBe('dark');

    // Login de novo simula abrir em outro dispositivo/navegador — precisa vir "dark" já,
    // sem precisar mexer em nada de novo.
    const secondLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    expect(secondLogin.body.user.theme_preference).toBe('dark');
  });
});
