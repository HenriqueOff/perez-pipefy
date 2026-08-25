import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@perezimoveis.com';
// Este repositório é público — um fallback fixo aqui seria uma senha de admin
// visível pra qualquer pessoa no mundo. Fica fixo só em dev (conveniência local);
// em produção, sem SEED_ADMIN_PASSWORD definido no ambiente, gera uma senha
// aleatória (impressa uma única vez no log de boot) em vez de usar um valor
// conhecido publicamente.
const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? (isProduction ? crypto.randomBytes(18).toString('base64url') : 'ChangeMe123!');

export async function seed(knex: Knex): Promise<void> {
  // Só faz sentido criar um admin de bootstrap se o sistema ainda não tem NENHUM —
  // checar só o e-mail fixo fazia esse admin ressuscitar a cada deploy sempre que
  // alguém apagava a conta, mesmo já existindo outros admins reais no banco.
  const anyAdmin = await knex('users').where({ global_role: 'admin' }).first();
  if (anyAdmin) {
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
