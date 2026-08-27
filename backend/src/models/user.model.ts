import { db } from '../config/db';
import { UserRow } from '../types/entities';
import { GlobalRole } from '../types/enums';

const TABLE = 'users';

export interface CreateUserInput {
  name: string;
  email: string;
  password_hash: string;
  global_role?: GlobalRole;
  must_change_password?: boolean;
}

export const UserModel = {
  findById(id: number) {
    return db<UserRow>(TABLE).where({ id }).first();
  },

  findByEmail(email: string) {
    return db<UserRow>(TABLE).where({ email }).first();
  },

  list() {
    return db<UserRow>(TABLE).select('id', 'name', 'email', 'global_role', 'active', 'created_at').orderBy('name');
  },

  // Usada quando quem pede não é admin (ex.: seletor de responsável/membro de pipeline):
  // não expõe global_role/active/created_at, que revelam a estrutura de privilégios do
  // sistema (quem é admin, quem está desativado) sem necessidade nenhuma pra esse uso.
  listBasic() {
    return db<UserRow>(TABLE).where({ active: true }).select('id', 'name', 'email').orderBy('name');
  },

  create(input: CreateUserInput) {
    return db<UserRow>(TABLE)
      .insert({ ...input, global_role: input.global_role ?? 'member' })
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<UserRow, 'name' | 'email' | 'global_role' | 'active'>>) {
    return db<UserRow>(TABLE)
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() })
      .returning('*')
      .then((rows) => rows[0]);
  },

  updatePassword(id: number, password_hash: string) {
    // Trocar a senha sempre satisfaz a exigência de troca obrigatória, senão o usuário
    // ficaria bloqueado de novo no próximo login mesmo já tendo trocado.
    return db<UserRow>(TABLE)
      .where({ id })
      .update({ password_hash, must_change_password: false, updated_at: db.fn.now() });
  },

  // Gera/regera o secret "pendente": fica salvo mas totp_enabled continua false até
  // confirmTotp() validar um código, então login nenhum passa a exigir 2FA só por isso.
  setPendingTotpSecret(id: number, encryptedSecret: string) {
    return db<UserRow>(TABLE)
      .where({ id })
      .update({ totp_secret_encrypted: encryptedSecret, totp_enabled: false, updated_at: db.fn.now() });
  },

  confirmTotp(id: number) {
    return db<UserRow>(TABLE).where({ id }).update({ totp_enabled: true, updated_at: db.fn.now() });
  },

  disableTotp(id: number) {
    return db<UserRow>(TABLE)
      .where({ id })
      .update({ totp_secret_encrypted: null, totp_enabled: false, updated_at: db.fn.now() });
  },
};
