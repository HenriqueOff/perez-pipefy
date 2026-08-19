import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@perezimoveis.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('users').where({ email: ADMIN_EMAIL }).first();
  if (existing) {
    return;
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await knex('users').insert({
    name: 'Administrador',
    email: ADMIN_EMAIL,
    password_hash,
    global_role: 'admin',
    active: true,
  });

  // eslint-disable-next-line no-console
  console.log(`Admin seedado: ${ADMIN_EMAIL} / senha inicial: ${ADMIN_PASSWORD} (troque após o primeiro login)`);
}
