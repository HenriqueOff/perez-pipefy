import request from 'supertest';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-2fa-admin-test@perezimoveis.com';
const MEMBER_EMAIL = 'zz-2fa-member-test@perezimoveis.com';
const PASSWORD = 'Senha2fa123!';

describe('autenticação em duas etapas (2FA)', () => {
  let adminId: number;
  let memberId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [admin] = await db('users')
      .insert({
        name: 'ZZ 2FA Admin Test',
        email: ADMIN_EMAIL,
        password_hash,
        global_role: 'admin',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    adminId = admin.id;

    const [member] = await db('users')
      .insert({
        name: 'ZZ 2FA Member Test',
        email: MEMBER_EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    memberId = member.id;
  });

  afterAll(async () => {
    await db('users').whereIn('id', [adminId, memberId]).del();
    await db.destroy();
  });

  afterEach(async () => {
    // Garante que cada teste comece com 2FA desativado, exceto quando o próprio teste
    // é quem verifica esse estado inicial.
    await db('users').where({ id: adminId }).update({ totp_enabled: false, totp_secret_encrypted: null });
  });

  it('recusa configurar 2FA pra um usuário que não é admin', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: MEMBER_EMAIL, password: PASSWORD });
    const res = await request(app)
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('configura, confirma e passa a exigir 2FA no login do admin', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(login.body.twoFactorRequired).toBe(false);

    const setup = await request(app)
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(setup.status).toBe(200);
    expect(setup.body.secret).toBeTruthy();
    expect(setup.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const badConfirm = await request(app)
      .post('/api/v1/auth/2fa/confirm')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code: '000000' });
    expect(badConfirm.status).toBe(400);

    const code = authenticator.generate(setup.body.secret);
    const confirm = await request(app)
      .post('/api/v1/auth/2fa/confirm')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code });
    expect(confirm.status).toBe(204);

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.body.totp_enabled).toBe(true);

    // Login volta a pedir o segundo fator a partir de agora.
    const secondLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(secondLogin.body.twoFactorRequired).toBe(true);
    expect(secondLogin.body.accessToken).toBeUndefined();
    expect(secondLogin.body.tempToken).toBeTruthy();

    const badVerify = await request(app)
      .post('/api/v1/auth/login/verify-2fa')
      .send({ tempToken: secondLogin.body.tempToken, code: '000000' });
    expect(badVerify.status).toBe(400);

    const verify = await request(app)
      .post('/api/v1/auth/login/verify-2fa')
      .send({ tempToken: secondLogin.body.tempToken, code: authenticator.generate(setup.body.secret) });
    expect(verify.status).toBe(200);
    expect(verify.body.accessToken).toBeTruthy();
    expect(verify.headers['set-cookie']).toBeTruthy();
  });

  it('desativa o 2FA só com a senha correta', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    const setup = await request(app)
      .post('/api/v1/auth/2fa/setup')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    await request(app)
      .post('/api/v1/auth/2fa/confirm')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code: authenticator.generate(setup.body.secret) });

    const badDisable = await request(app)
      .post('/api/v1/auth/2fa/disable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ password: 'senha-errada' });
    expect(badDisable.status).toBe(400);

    const disable = await request(app)
      .post('/api/v1/auth/2fa/disable')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ password: PASSWORD });
    expect(disable.status).toBe(204);

    const nextLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(nextLogin.body.twoFactorRequired).toBe(false);
  });
});
