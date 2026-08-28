import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app';
import { db } from '../../src/config/db';
import { UserService } from '../../src/services/user.service';

const app = createApp();

const ADMIN_A = 'zz-guard-admin-a-test@perezimoveis.com';
const ADMIN_B = 'zz-guard-admin-b-test@perezimoveis.com';
const MEMBER = 'zz-guard-member-test@perezimoveis.com';
const PASSWORD = 'SenhaGuard123!';

describe('guardas administrativas de UserService.update', () => {
  let adminAId: number;
  let adminBId: number;
  let memberId: number;
  let adminAToken: string;

  async function mkUser(name: string, email: string, role: 'admin' | 'member') {
    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const [u] = await db('users')
      .insert({ name, email, password_hash, global_role: role, active: true, must_change_password: false })
      .returning('id');
    return u.id as number;
  }

  beforeAll(async () => {
    adminAId = await mkUser('ZZ Guard Admin A', ADMIN_A, 'admin');
    adminBId = await mkUser('ZZ Guard Admin B', ADMIN_B, 'admin');
    memberId = await mkUser('ZZ Guard Member', MEMBER, 'member');
    adminAToken = (await request(app).post('/api/v1/auth/login').send({ email: ADMIN_A, password: PASSWORD })).body
      .accessToken;
  });

  afterAll(async () => {
    await db('users').whereIn('id', [adminAId, adminBId, memberId].filter(Boolean)).del();
    await db.destroy();
  });

  const asA = () => ({ Authorization: `Bearer ${adminAToken}` });

  it('um admin não pode rebaixar o próprio papel', async () => {
    const res = await request(app).patch(`/api/v1/users/${adminAId}`).set(asA()).send({ global_role: 'member' });
    expect(res.status).toBe(403);
  });

  it('um admin não pode desativar a própria conta', async () => {
    const res = await request(app).patch(`/api/v1/users/${adminAId}`).set(asA()).send({ active: false });
    expect(res.status).toBe(403);
  });

  it('um admin pode editar o próprio nome normalmente', async () => {
    const res = await request(app).patch(`/api/v1/users/${adminAId}`).set(asA()).send({ name: 'ZZ Guard Admin A (edit)' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('ZZ Guard Admin A (edit)');
  });

  it('um admin pode rebaixar OUTRO admin quando ainda sobra admin ativo', async () => {
    const res = await request(app).patch(`/api/v1/users/${adminBId}`).set(asA()).send({ global_role: 'member' });
    expect(res.status).toBe(200);
    expect(res.body.global_role).toBe('member');
    // restaura
    await request(app).patch(`/api/v1/users/${adminBId}`).set(asA()).send({ global_role: 'admin' });
  });

  it('serviço: bloqueia rebaixar/desativar o último admin ativo (defesa em profundidade)', async () => {
    const others = (
      await db('users').where({ global_role: 'admin', active: true }).whereNot({ id: adminAId }).select('id')
    ).map((o: { id: number }) => o.id);
    await db('users').whereIn('id', others).update({ global_role: 'member' });
    try {
      await expect(UserService.update(adminAId, { global_role: 'member' })).rejects.toThrow(/último administrador/);
      await expect(UserService.update(adminAId, { active: false })).rejects.toThrow(/último administrador/);

      // com um segundo admin de volta, a mesma operação passa
      await db('users').where({ id: adminBId }).update({ global_role: 'admin' });
      const ok = await UserService.update(adminAId, { name: 'ainda admin' });
      expect(ok.global_role).toBe('admin');
    } finally {
      await db('users').whereIn('id', others).update({ global_role: 'admin' });
    }
  });
});
