import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-idor-admin-test@perezimoveis.com';
const MEMBER_EMAIL = 'zz-idor-member-test@perezimoveis.com';
const PASSWORD = 'SenhaIdor123!';

// Regressão do achado crítico do RELATORIO_SEGURANCA (IDOR sistêmico entre pipelines):
// requirePipelineRole só confere o papel no :pipelineId da URL, nunca se o recurso
// aninhado (:cardId, :labelId, :recordId...) pertence de fato àquele pipeline/database.
// O membro abaixo é MANAGER do pipeline B (logo passa por todos os middlewares de papel
// de B) e não tem vínculo nenhum com o pipeline A — toda tentativa de alcançar recursos
// de A pela URL de B tem que responder 404 (não 200, e não 403, que confirmaria a
// existência do recurso em outro pipeline).
describe('IDOR entre pipelines e entre databases', () => {
  let adminToken: string;
  let memberToken: string;
  let adminId: number;
  let memberId: number;

  let pipelineAId: number;
  let pipelineBId: number;
  let phaseAId: number;
  let phaseBId: number;
  let cardAId: number;
  let labelAId: number;
  let labelBId: number;

  let databaseAId: number;
  let databaseBId: number;
  let fieldAId: number;
  let recordAId: number;

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const member = () => ({ Authorization: `Bearer ${memberToken}` });

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [a] = await db('users')
      .insert({
        name: 'ZZ IDOR Admin',
        email: ADMIN_EMAIL,
        password_hash,
        global_role: 'admin',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    adminId = a.id;
    const [m] = await db('users')
      .insert({
        name: 'ZZ IDOR Member',
        email: MEMBER_EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    memberId = m.id;

    adminToken = (await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD })).body
      .accessToken;
    memberToken = (await request(app).post('/api/v1/auth/login').send({ email: MEMBER_EMAIL, password: PASSWORD })).body
      .accessToken;

    // Pipeline A — o membro NÃO tem vínculo
    const pa = await request(app).post('/api/v1/pipelines').set(admin()).send({ name: 'ZZ IDOR Pipeline A (secreto)' });
    pipelineAId = pa.body.id;
    phaseAId = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineAId}/phases`)
        .set(admin())
        .send({ name: 'Fase A', is_initial: true })
    ).body.id;
    cardAId = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineAId}/cards`)
        .set(admin())
        .send({ title: 'Card sigiloso de A' })
    ).body.id;
    labelAId = (
      await request(app).post(`/api/v1/pipelines/${pipelineAId}/labels`).set(admin()).send({ name: 'Label A' })
    ).body.id;

    // Pipeline B — o membro é MANAGER
    const pb = await request(app).post('/api/v1/pipelines').set(admin()).send({ name: 'ZZ IDOR Pipeline B' });
    pipelineBId = pb.body.id;
    await request(app)
      .post(`/api/v1/pipelines/${pipelineBId}/members`)
      .set(admin())
      .send({ userId: memberId, role: 'manager' });
    phaseBId = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineBId}/phases`)
        .set(admin())
        .send({ name: 'Fase B', is_initial: true })
    ).body.id;
    labelBId = (
      await request(app).post(`/api/v1/pipelines/${pipelineBId}/labels`).set(admin()).send({ name: 'Label B' })
    ).body.id;

    // Databases: idem, mas a checagem de posse do registro está no service, então basta
    // o admin (bypass de papel) para exercitar assertRecordInDatabase / field.database_id.
    databaseAId = (
      await request(app).post('/api/v1/databases').set(admin()).send({ name: 'ZZ IDOR Database A' })
    ).body.id;
    databaseBId = (
      await request(app).post('/api/v1/databases').set(admin()).send({ name: 'ZZ IDOR Database B' })
    ).body.id;
    fieldAId = (
      await request(app)
        .post(`/api/v1/databases/${databaseAId}/fields`)
        .set(admin())
        .send({ label: 'Campo A', key: 'campo_a', type: 'text' })
    ).body.id;
    recordAId = (
      await request(app)
        .post(`/api/v1/databases/${databaseAId}/records`)
        .set(admin())
        .send({ title: 'Registro de A' })
    ).body.id;
  });

  afterAll(async () => {
    await db('pipelines').whereIn('id', [pipelineAId, pipelineBId].filter(Boolean)).del();
    await db('databases').whereIn('id', [databaseAId, databaseBId].filter(Boolean)).del();
    await db('users').whereIn('id', [adminId, memberId].filter(Boolean)).del();
    await db.destroy();
  });

  it('o membro não alcança o pipeline A de forma alguma', async () => {
    const res = await request(app).get(`/api/v1/pipelines/${pipelineAId}`).set(member());
    expect(res.status).toBe(403);
  });

  it('GET card de A pela URL de B -> 404', async () => {
    const res = await request(app).get(`/api/v1/pipelines/${pipelineBId}/cards/${cardAId}`).set(member());
    expect(res.status).toBe(404);
    expect(res.body.title).toBeUndefined();
  });

  it('PATCH card de A pela URL de B -> 404 (e o card de A permanece intacto)', async () => {
    const res = await request(app)
      .patch(`/api/v1/pipelines/${pipelineBId}/cards/${cardAId}`)
      .set(member())
      .send({ title: 'PWNED' });
    expect(res.status).toBe(404);

    const check = await request(app).get(`/api/v1/pipelines/${pipelineAId}/cards/${cardAId}`).set(admin());
    expect(check.body.title).toBe('Card sigiloso de A');
  });

  it('POST comentário no card de A pela URL de B -> 404', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineBId}/cards/${cardAId}/comments`)
      .set(member())
      .send({ body: 'comentário injetado' });
    expect(res.status).toBe(404);
  });

  it('POST responsável no card de A pela URL de B -> 404', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineBId}/cards/${cardAId}/assignees`)
      .set(member())
      .send({ user_id: memberId });
    expect(res.status).toBe(404);
  });

  it('anexar etiqueta de B ao card de A pela URL de B -> 404', async () => {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineBId}/cards/${cardAId}/labels`)
      .set(member())
      .send({ label_id: labelBId });
    expect(res.status).toBe(404);
  });

  it('PATCH etiqueta de A pela URL de B -> 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/pipelines/${pipelineBId}/labels/${labelAId}`)
      .set(member())
      .send({ name: 'renomeada por fora' });
    expect(res.status).toBe(404);
  });

  it('controle: o membro opera normalmente dentro do próprio pipeline B', async () => {
    const card = await request(app)
      .post(`/api/v1/pipelines/${pipelineBId}/cards`)
      .set(member())
      .send({ title: 'Card legítimo de B' });
    expect(card.status).toBe(201);

    const detail = await request(app)
      .get(`/api/v1/pipelines/${pipelineBId}/cards/${card.body.id}`)
      .set(member());
    expect(detail.status).toBe(200);

    const comment = await request(app)
      .post(`/api/v1/pipelines/${pipelineBId}/cards/${card.body.id}/comments`)
      .set(member())
      .send({ body: 'comentário legítimo' });
    expect(comment.status).toBe(201);
  });

  it('PATCH registro de A pela URL do database B -> 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/databases/${databaseBId}/records/${recordAId}`)
      .set(admin())
      .send({ title: 'PWNED' });
    expect(res.status).toBe(404);
  });

  it('PATCH campos do registro de A pela URL do database B -> 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/databases/${databaseBId}/records/${recordAId}/fields`)
      .set(admin())
      .send({ fields: { campo_a: 'x' } });
    expect(res.status).toBe(404);
  });

  it('DELETE registro de A pela URL do database B -> 404 (e o registro sobrevive)', async () => {
    const res = await request(app).delete(`/api/v1/databases/${databaseBId}/records/${recordAId}`).set(admin());
    expect(res.status).toBe(404);

    const still = await request(app).get(`/api/v1/databases/${databaseAId}/records`).set(admin());
    expect(still.body.records.map((r: { id: number }) => r.id)).toContain(recordAId);
  });

  it('PATCH campo de A pela URL do database B -> 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/databases/${databaseBId}/fields/${fieldAId}`)
      .set(admin())
      .send({ label: 'renomeado por fora' });
    expect(res.status).toBe(404);
  });
});
