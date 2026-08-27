import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-phone-field-admin-test@perezimoveis.com';
const PASSWORD = 'SenhaTelefone123!';

describe('campo customizado do tipo phone', () => {
  let adminToken: string;
  let adminId: number;
  let pipelineId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [admin] = await db('users')
      .insert({
        name: 'ZZ Phone Field Admin Test',
        email: ADMIN_EMAIL,
        password_hash,
        global_role: 'admin',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    adminId = admin.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = login.body.accessToken;

    const pipeline = await request(app)
      .post('/api/v1/pipelines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ZZ Phone Field Test Pipeline' });
    pipelineId = pipeline.body.id;
  });

  afterAll(async () => {
    if (pipelineId) await db('pipelines').where({ id: pipelineId }).del();
    await db('users').where({ id: adminId }).del();
    await db.destroy();
  });

  it('cria um campo do tipo phone numa fase', async () => {
    const phase = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fase única', is_initial: true });

    const field = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases/${phase.body.id}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Telefone', key: 'telefone', type: 'phone' });

    expect(field.status).toBe(201);
    expect(field.body.type).toBe('phone');

    const card = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Card com telefone' });

    const update = await request(app)
      .patch(`/api/v1/pipelines/${pipelineId}/cards/${card.body.id}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fields: { telefone: '(11) 91234-5678' } });

    expect(update.status).toBe(200);
    expect(update.body[0].value).toBe('(11) 91234-5678');
  });

  it('recusa valor não-string pro campo phone', async () => {
    const phase = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fase 2' });
    const field = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases/${phase.body.id}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Telefone 2', key: 'telefone2', type: 'phone' });
    const card = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Card 2', phase_id: phase.body.id });

    const update = await request(app)
      .patch(`/api/v1/pipelines/${pipelineId}/cards/${card.body.id}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fields: { telefone2: 12345 } });

    expect(update.status).toBe(422);
    expect(field.status).toBe(201);
  });
});
