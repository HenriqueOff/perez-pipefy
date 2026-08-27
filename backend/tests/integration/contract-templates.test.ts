import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-contract-admin-test@perezimoveis.com';
const MEMBER_EMAIL = 'zz-contract-member-test@perezimoveis.com';
const PASSWORD = 'SenhaContrato123!';

describe('geração de contrato a partir de modelo', () => {
  let adminToken: string;
  let memberToken: string;
  let adminId: number;
  let memberId: number;
  let pipelineId: number;
  let phaseId: number;
  let cardId: number;
  let templateId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [admin] = await db('users')
      .insert({
        name: 'ZZ Contract Admin Test',
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
        name: 'ZZ Contract Member Test',
        email: MEMBER_EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    memberId = member.id;

    const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = adminLogin.body.accessToken;
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: MEMBER_EMAIL, password: PASSWORD });
    memberToken = memberLogin.body.accessToken;

    const pipeline = await request(app)
      .post('/api/v1/pipelines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ZZ Contract Test Pipeline' });
    pipelineId = pipeline.body.id;

    const phase = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fase única', is_initial: true });
    phaseId = phase.body.id;

    await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases/${phaseId}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Endereço', key: 'endereco', type: 'text' });

    const card = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Imóvel Rua Teste, 42' });
    cardId = card.body.id;

    await request(app)
      .patch(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fields: { endereco: 'Rua Teste, 42' } });

    // Membro vira viewer do pipeline pra poder gerar o contrato (não é admin, mas
    // precisa enxergar o card).
    await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId, role: 'viewer' });
  });

  afterAll(async () => {
    if (pipelineId) await db('pipelines').where({ id: pipelineId }).del();
    await db('users').whereIn('id', [adminId, memberId]).del();
    await db.destroy();
  });

  it('recusa membro comum criar modelo de contrato', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/contract-templates`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Contrato padrão', body_html: '<p>{{title}}</p>' });
    expect(res.status).toBe(403);
  });

  it('admin cria um modelo de contrato', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/contract-templates`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Contrato padrão',
        body_html: '<h1>Contrato: {{title}}</h1><p>Endereço: {{campo.endereco}}</p>',
      });
    expect(res.status).toBe(201);
    templateId = res.body.id;
  });

  it('gera o contrato interpolando os placeholders com os dados do card', async () => {
    const res = await request(app)
      .get(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/contracts/${templateId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Contrato: Imóvel Rua Teste, 42');
    expect(res.text).toContain('Endereço: Rua Teste, 42');
  });

  it('permite um membro viewer do pipeline gerar o contrato também', async () => {
    const res = await request(app)
      .get(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/contracts/${templateId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('Imóvel Rua Teste, 42');
  });

  it('404 pra modelo de outro pipeline', async () => {
    const otherPipeline = await request(app)
      .post('/api/v1/pipelines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ZZ Contract Test Pipeline B' });

    try {
      const res = await request(app)
        .get(`/api/v1/pipelines/${otherPipeline.body.id}/cards/${cardId}/contracts/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    } finally {
      await db('pipelines').where({ id: otherPipeline.body.id }).del();
    }
  });
});
