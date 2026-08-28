import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';

const app = createApp();

const ADMIN_EMAIL = 'zz-automations-admin-test@perezimoveis.com';
const MEMBER_EMAIL = 'zz-automations-member-test@perezimoveis.com';
const PASSWORD = 'SenhaAutomacoes123!';

// As automações rodam de forma síncrona (awaited) dentro de CardService.create/move/
// updateFields, então dá pra checar o efeito logo depois da resposta HTTP. `automation.
// service.ts` tinha 828 linhas e zero teste — este arquivo cobre o casamento de gatilho
// (fase certa/errada, valor de campo certo/errado, flag active) e três tipos de ação.
describe('automações', () => {
  let adminToken: string;
  let adminId: number;
  let memberId: number;
  let pipelineId: number;
  let phase1Id: number;
  let phase2Id: number;
  let phase3Id: number;
  let labelId: number;
  let gateFieldId: number;

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  async function createAutomation(body: Record<string, unknown>) {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/automations`)
      .set(auth())
      .send(body);
    expect(res.status).toBe(201);
    return res.body.id as number;
  }

  async function deleteAutomation(id: number) {
    await request(app).delete(`/api/v1/pipelines/${pipelineId}/automations/${id}`).set(auth());
  }

  async function createCard(title: string) {
    const res = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards`)
      .set(auth())
      .send({ title });
    expect(res.status).toBe(201);
    return res.body.id as number;
  }

  function getCard(cardId: number) {
    return request(app).get(`/api/v1/pipelines/${pipelineId}/cards/${cardId}`).set(auth());
  }

  beforeAll(async () => {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [admin] = await db('users')
      .insert({
        name: 'ZZ Automations Admin',
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
        name: 'ZZ Automations Member',
        email: MEMBER_EMAIL,
        password_hash,
        global_role: 'member',
        active: true,
        must_change_password: false,
      })
      .returning('id');
    memberId = member.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = login.body.accessToken;

    const pipeline = await request(app)
      .post('/api/v1/pipelines')
      .set(auth())
      .send({ name: 'ZZ Automations Test Pipeline' });
    pipelineId = pipeline.body.id;

    const p1 = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set(auth())
      .send({ name: 'Entrada', is_initial: true });
    phase1Id = p1.body.id;
    const p2 = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set(auth())
      .send({ name: 'Em andamento' });
    phase2Id = p2.body.id;
    const p3 = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases`)
      .set(auth())
      .send({ name: 'Concluído', is_final: true });
    phase3Id = p3.body.id;

    const label = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/labels`)
      .set(auth())
      .send({ name: 'Urgente', color: '#ff0000' });
    labelId = label.body.id;

    const field = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/phases/${phase1Id}/fields`)
      .set(auth())
      .send({ label: 'Aprovado', key: 'aprovado', type: 'select', options: ['sim', 'nao'] });
    gateFieldId = field.body.id;
  });

  afterAll(async () => {
    if (pipelineId) {
      await db('pipelines').where({ id: pipelineId }).del();
    }
    await db('users').whereIn('id', [adminId, memberId].filter(Boolean)).del();
    await db.destroy();
  });

  it('gatilho card_created_in_phase dispara a ação add_label', async () => {
    const automationId = await createAutomation({
      name: 'Rotula ao entrar',
      trigger_type: 'card_created_in_phase',
      trigger_config: { phase_id: phase1Id },
      action_type: 'add_label',
      action_config: { label_id: labelId },
    });

    const cardId = await createCard('Card com etiqueta automática');
    const detail = await getCard(cardId);
    expect(detail.body.labels.map((l: { id: number }) => l.id)).toContain(labelId);

    await deleteAutomation(automationId);
  });

  it('gatilho card_moved_to_phase dispara a ação assign_user', async () => {
    const automationId = await createAutomation({
      name: 'Atribui ao mover',
      trigger_type: 'card_moved_to_phase',
      trigger_config: { phase_id: phase2Id },
      action_type: 'assign_user',
      action_config: { user_id: memberId },
    });

    const cardId = await createCard('Card a ser atribuído');
    const move = await request(app)
      .post(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/move`)
      .set(auth())
      .send({ to_phase_id: phase2Id });
    expect(move.status).toBe(200);

    const detail = await getCard(cardId);
    expect(detail.body.assignees.map((a: { user_id: number }) => a.user_id)).toContain(memberId);

    await deleteAutomation(automationId);
  });

  it('gatilho field_updated só dispara quando o valor casa com o configurado', async () => {
    const automationId = await createAutomation({
      name: 'Avança quando aprovado',
      trigger_type: 'field_updated',
      trigger_config: { field_id: gateFieldId, value: 'sim' },
      action_type: 'move_to_phase',
      action_config: { phase_id: phase3Id },
    });

    const cardId = await createCard('Card controlado por campo');

    // valor que NÃO casa: o card não se move
    await request(app)
      .patch(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/fields`)
      .set(auth())
      .send({ fields: { aprovado: 'nao' } });
    let detail = await getCard(cardId);
    expect(detail.body.current_phase_id).toBe(phase1Id);

    // valor que casa: o card avança para a fase final
    await request(app)
      .patch(`/api/v1/pipelines/${pipelineId}/cards/${cardId}/fields`)
      .set(auth())
      .send({ fields: { aprovado: 'sim' } });
    detail = await getCard(cardId);
    expect(detail.body.current_phase_id).toBe(phase3Id);

    await deleteAutomation(automationId);
  });

  it('não dispara quando o card é criado numa fase diferente da configurada', async () => {
    const automationId = await createAutomation({
      name: 'Só na fase 2',
      trigger_type: 'card_created_in_phase',
      trigger_config: { phase_id: phase2Id },
      action_type: 'add_label',
      action_config: { label_id: labelId },
    });

    const cardId = await createCard('Criado na fase 1, não deve receber etiqueta');
    const detail = await getCard(cardId);
    expect(detail.body.labels).toHaveLength(0);

    await deleteAutomation(automationId);
  });

  it('automação com active:false não roda', async () => {
    const automationId = await createAutomation({
      name: 'Desligada',
      trigger_type: 'card_created_in_phase',
      trigger_config: { phase_id: phase1Id },
      action_type: 'add_label',
      action_config: { label_id: labelId },
      active: false,
    });

    const cardId = await createCard('Automação desligada, sem etiqueta');
    const detail = await getCard(cardId);
    expect(detail.body.labels).toHaveLength(0);

    await deleteAutomation(automationId);
  });

  it('gerenciar automações exige admin global (manager/owner do pipeline não basta)', async () => {
    // membro é owner do pipeline abaixo, mas não é admin global
    const ownedPipeline = await request(app)
      .post('/api/v1/pipelines')
      .set(auth())
      .send({ name: 'ZZ Automations Member-Owned' });
    await request(app)
      .post(`/api/v1/pipelines/${ownedPipeline.body.id}/members`)
      .set(auth())
      .send({ userId: memberId, role: 'owner' });

    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: MEMBER_EMAIL, password: PASSWORD });

    const res = await request(app)
      .post(`/api/v1/pipelines/${ownedPipeline.body.id}/automations`)
      .set('Authorization', `Bearer ${memberLogin.body.accessToken}`)
      .send({
        name: 'Tentativa de não-admin',
        trigger_type: 'card_created_in_phase',
        action_type: 'add_label',
        action_config: { label_id: 1 },
      });
    expect(res.status).toBe(403);

    await db('pipelines').where({ id: ownedPipeline.body.id }).del();
  });
});
