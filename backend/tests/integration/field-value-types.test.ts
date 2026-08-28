import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-fvtypes-admin-test@perezimoveis.com';
const PASSWORD = 'SenhaFvTypes123!';

// A coluna `value` de card_field_values e database_record_field_values é jsonb e todo
// caminho de escrita faz JSON.stringify(value) uma única vez. Este teste faz o
// round-trip de tipos não triviais (número, booleano, texto com aspas) e confirma que
// eles voltam como o tipo JS certo — pega double-encoding se algum dia aparecer.
describe('serialização de valores de campo (jsonb)', () => {
  let token: string;
  let adminId: number;
  let pipelineId: number;
  let phaseId: number;
  let databaseId: number;
  const fieldIds: Record<string, number> = {};

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [admin] = await db('users')
      .insert({
        name: 'ZZ FvTypes Admin',
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

    pipelineId = (await request(app).post('/api/v1/pipelines').set(auth()).send({ name: 'ZZ FvTypes Pipeline' })).body.id;
    phaseId = (
      await request(app)
        .post(`/api/v1/pipelines/${pipelineId}/phases`)
        .set(auth())
        .send({ name: 'Fase', is_initial: true })
    ).body.id;
    for (const [key, type] of [
      ['obs', 'text'],
      ['preco', 'number'],
      ['aceita_pet', 'boolean'],
    ] as const) {
      fieldIds[key] = (
        await request(app)
          .post(`/api/v1/pipelines/${pipelineId}/phases/${phaseId}/fields`)
          .set(auth())
          .send({ label: key, key, type })
      ).body.id;
    }

    databaseId = (await request(app).post('/api/v1/databases').set(auth()).send({ name: 'ZZ FvTypes DB' })).body.id;
    for (const [key, type] of [
      ['nome', 'text'],
      ['idade', 'number'],
      ['ativo', 'boolean'],
    ] as const) {
      await request(app)
        .post(`/api/v1/databases/${databaseId}/fields`)
        .set(auth())
        .send({ label: key, key, type });
    }
  });

  afterAll(async () => {
    if (pipelineId) await db('pipelines').where({ id: pipelineId }).del();
    if (databaseId) await db('databases').where({ id: databaseId }).del();
    await db('users').where({ id: adminId }).del();
    await db.destroy();
  });

  it('card: número, booleano e texto com aspas voltam com o tipo certo', async () => {
    const quirkyText = 'Rua "das Flores", nº 3 — fundos';
    const card = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards`)
      .set(auth())
      .send({ title: 'Imóvel', fields: { obs: quirkyText, preco: 250000.5, aceita_pet: true } });
    expect(card.status).toBe(201);

    const detail = await request(app).get(`/api/v1/pipelines/${pipelineId}/cards/${card.body.id}`).set(auth());
    const byField = new Map<number, unknown>(
      detail.body.fieldValues.map((v: { custom_field_id: number; value: unknown }) => [v.custom_field_id, v.value])
    );
    expect(byField.get(fieldIds.obs)).toBe(quirkyText);
    expect(byField.get(fieldIds.preco)).toBe(250000.5);
    expect(byField.get(fieldIds.aceita_pet)).toBe(true);
  });

  it('database: número, booleano e texto com aspas voltam com o tipo certo', async () => {
    const quirkyText = 'Sr. "Zé" da Silva';
    const rec = await request(app)
      .post(`/api/v1/databases/${databaseId}/records`)
      .set(auth())
      .send({ title: 'Pessoa', fields: { nome: quirkyText, idade: 42, ativo: false } });
    expect(rec.status).toBe(201);

    const list = await request(app).get(`/api/v1/databases/${databaseId}/records`).set(auth());
    const record = list.body.records.find((r: { id: number }) => r.id === rec.body.id);
    const byField = new Map<number, unknown>(
      record.fieldValues.map((v: { fieldId: number; value: unknown }) => [v.fieldId, v.value])
    );
    const fields = list.body.fields as { id: number; key: string }[];
    const idOf = (k: string) => fields.find((f) => f.key === k)!.id;
    expect(byField.get(idOf('nome'))).toBe(quirkyText);
    expect(byField.get(idOf('idade'))).toBe(42);
    expect(byField.get(idOf('ativo'))).toBe(false);
  });
});
