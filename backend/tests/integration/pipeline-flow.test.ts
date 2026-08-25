import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

// Usuário próprio da suíte em vez de depender do admin seedado: esse banco é compartilhado
// com dev/produção (sem DB efêmera de teste), e o admin seedado pode nem existir mais
// (ex.: conta de bootstrap removida de propósito depois que admins reais já existiam).
const TEST_ADMIN_EMAIL = 'zz-integration-test-admin@perezimoveis.com';
const TEST_ADMIN_PASSWORD = 'TesteIntegracao123!';

describe('fluxo completo de pipeline', () => {
  let accessToken: string;
  let testAdminId: number;
  let pipelineId: number;
  let phase1Id: number;
  let phase2Id: number;
  let fieldId: number;
  let cardId: number;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
    const [user] = await db('users')
      .insert({
        name: 'ZZ Integration Test Admin',
        email: TEST_ADMIN_EMAIL,
        password_hash,
        global_role: 'admin',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    testAdminId = user.id;
  });

  afterAll(async () => {
    // Sem isso, cada execução deixa um pipeline "Captação de imóveis - teste" órfão no
    // banco (não há DB efêmera/dedicada de teste) — acumular esse lixo entre rodadas é
    // uma causa comum de resultados inconsistentes ao rodar a suíte repetidas vezes.
    if (pipelineId) {
      await db('pipelines').where({ id: pipelineId }).del();
    }
    if (testAdminId) {
      await db('users').where({ id: testAdminId }).del();
    }
    await db.destroy();
  });

  it('faz login com o admin de teste', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('cria um pipeline', async () => {
    const res = await request(app)
      .post('/api/v1/pipelines')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Captação de imóveis - teste' });
    expect(res.status).toBe(201);
    pipelineId = res.body.id;
  });

  it('cria duas fases', async () => {
    const res1 = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Novo', is_initial: true });
    expect(res1.status).toBe(201);
    phase1Id = res1.body.id;

    const res2 = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Em análise' });
    expect(res2.status).toBe(201);
    phase2Id = res2.body.id;
  });

  it('cria um campo customizado obrigatório na fase inicial', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases/${phase1Id}/fields`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ label: 'Endereço', key: 'endereco', type: 'text', required: true });
    expect(res.status).toBe(201);
    fieldId = res.body.id;
  });

  it('cria um card na fase inicial', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Imóvel Rua das Flores, 123' });
    expect(res.status).toBe(201);
    cardId = res.body.id;
    expect(res.body.current_phase_id).toBe(phase1Id);
  });

  it('impede mover o card sem preencher o campo obrigatório', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ to_phase_id: phase2Id });
    expect(res.status).toBe(422);
  });

  it('preenche o campo obrigatório e move o card', async () => {
    const fieldsRes = await request(app)
      .patch(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/fields`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fields: { endereco: 'Rua das Flores, 123' } });
    expect(fieldsRes.status).toBe(200);

    const moveRes = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ to_phase_id: phase2Id });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.current_phase_id).toBe(phase2Id);
  });

  it('registra o histórico do card (created, field_updated, moved)', async () => {
    const res = await request(app)
      .get(`/api/v1/pipelines/${pipelineId}/cards/${cardId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    const eventTypes = res.body.history.map((h: { event_type: string }) => h.event_type);
    expect(eventTypes).toEqual(expect.arrayContaining(['created', 'field_updated', 'moved']));
  });
});
