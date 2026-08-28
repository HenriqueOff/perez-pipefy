import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-batching-admin-test@perezimoveis.com';
const PASSWORD = 'SenhaBatching123!';

// Guarda a remoção do N+1 em CardService.listByPipeline / PipelineService.getDetail /
// DatabaseService.listRecords: os valores de campo passaram a vir numa consulta única
// agrupada em memória — este teste garante que nenhum valor "vaza" de um card/registro
// para outro e que a contagem por fase continua certa.
describe('agrupamento em lote de valores de campo (sem N+1)', () => {
  let token: string;
  let adminId: number;
  let pipelineId: number;
  let phase1Id: number;
  let phase2Id: number;
  let fieldAId: number;
  let fieldBId: number;
  let databaseId: number;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [admin] = await db('users')
      .insert({
        name: 'ZZ Batching Admin',
        email: ADMIN_EMAIL,
        password_hash,
        global_role: 'admin',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    adminId = admin.id;
    token = (await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD })).body
      .accessToken;

    pipelineId = (
      await request(app).post('/api/v1/pipelines').set(auth()).send({ name: 'ZZ Batching Pipeline' })
    ).body.id;
    phase1Id = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineId}/phases`)
        .set(auth())
        .send({ name: 'Fase 1', is_initial: true })
    ).body.id;
    phase2Id = (
      await request(app).post(`/api/v1/pipelines/${pipelineId}/phases`).set(auth()).send({ name: 'Fase 2' })
    ).body.id;
    fieldAId = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineId}/phases/${phase1Id}/fields`)
        .set(auth())
        .send({ label: 'Bairro', key: 'bairro', type: 'text' })
    ).body.id;
    fieldBId = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineId}/phases/${phase1Id}/fields`)
        .set(auth())
        .send({ label: 'Quartos', key: 'quartos', type: 'number' })
    ).body.id;

    databaseId = (
      await request(app).post('/api/v1/databases').set(auth()).send({ name: 'ZZ Batching Database' })
    ).body.id;
    await request(app)
      .post(`/api/v1/databases/${databaseId}/fields`)
      .set(auth())
      .send({ label: 'Documento', key: 'documento', type: 'text' });
  });

  afterAll(async () => {
    if (pipelineId) await db('pipelines').where({ id: pipelineId }).del();
    if (databaseId) await db('databases').where({ id: databaseId }).del();
    await db('users').where({ id: adminId }).del();
    await db.destroy();
  });

  it('GET /cards agrupa os valores por card, sem mistura', async () => {
    const specs = [
      { title: 'Casa Centro', bairro: 'Centro', quartos: 3 },
      { title: 'Ap Jardins', bairro: 'Jardins', quartos: 2 },
      { title: 'Kitnet Vila', bairro: 'Vila', quartos: 1 },
    ];
    const ids: number[] = [];
    for (const spec of specs) {
      const res = await request(app)
        .post(`/api/v1/pipelines/${pipelineId}/cards`)
        .set(auth())
        .send({ title: spec.title, fields: { bairro: spec.bairro, quartos: spec.quartos } });
      expect(res.status).toBe(201);
      ids.push(res.body.id);
    }

    const list = await request(app).get(`/api/v1/pipelines/${pipelineId}/cards`).set(auth());
    expect(list.status).toBe(200);

    for (let i = 0; i < specs.length; i++) {
      const card = list.body.find((c: { id: number }) => c.id === ids[i]);
      expect(card).toBeDefined();
      const byField = new Map<number, unknown>(
        card.fieldValues.map((v: { custom_field_id: number; value: unknown }) => [v.custom_field_id, v.value])
      );
      expect(card.fieldValues).toHaveLength(2);
      expect(byField.get(fieldAId)).toBe(specs[i].bairro);
      expect(Number(byField.get(fieldBId))).toBe(specs[i].quartos);
    }
  });

  it('GET /pipelines/:id agrupa os campos por fase', async () => {
    const detail = await request(app).get(`/api/v1/pipelines/${pipelineId}`).set(auth());
    expect(detail.status).toBe(200);
    const p1 = detail.body.phases.find((p: { id: number }) => p.id === phase1Id);
    const p2 = detail.body.phases.find((p: { id: number }) => p.id === phase2Id);
    expect(p1.customFields.map((f: { id: number }) => f.id).sort()).toEqual([fieldAId, fieldBId].sort());
    expect(p2.customFields).toHaveLength(0);
  });

  it('GET /databases/:id/records agrupa os valores por registro', async () => {
    const docs = ['111.111.111-11', '222.222.222-22', '333.333.333-33'];
    const ids: number[] = [];
    for (const documento of docs) {
      const res = await request(app)
        .post(`/api/v1/databases/${databaseId}/records`)
        .set(auth())
        .send({ title: `Registro ${documento}`, fields: { documento } });
      expect(res.status).toBe(201);
      ids.push(res.body.id);
    }

    const list = await request(app).get(`/api/v1/databases/${databaseId}/records`).set(auth());
    expect(list.status).toBe(200);
    for (let i = 0; i < docs.length; i++) {
      const record = list.body.records.find((r: { id: number }) => r.id === ids[i]);
      expect(record.fieldValues).toHaveLength(1);
      expect(record.fieldValues[0].value).toBe(docs[i]);
    }
  });
});
