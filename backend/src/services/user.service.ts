import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
import { UserRow } from '../types/entities';
import { GlobalRole } from '../types/enums';
import { AppError } from '../utils/AppError';

function sanitize(user: UserRow) {
  const { password_hash, ...safe } = user;
  return safe;
}

export const UserService = {
  list(isAdmin: boolean) {
    return isAdmin ? UserModel.list() : UserModel.listBasic();
  },

  async create(input: { name: string; email: string; password: string; global_role?: GlobalRole }) {
    const existing = await UserModel.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('Já existe um usuário com este e-mail');
    }

    const password_hash = await bcrypt.hash(input.password, 12);
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      password_hash,
      global_role: input.global_role,
      // Senha provisória escolhida pelo admin, não pelo próprio usuário — força troca
      // no primeiro login em vez de deixar como sugestão que ninguém segue.
      must_change_password: true,
    });
    return sanitize(user);
  },

  async update(
    id: number,
    changes: { name?: string; email?: string; global_role?: GlobalRole; active?: boolean },
    actingUserId?: number
  ) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound('Usuário não encontrado');
    }

    const demotesFromAdmin =
      user.global_role === 'admin' && changes.global_role !== undefined && changes.global_role !== 'admin';
    const deactivates = user.active && changes.active === false;

    // Um admin não pode se rebaixar nem desativar a própria conta (footgun clássico de
    // travar o próprio acesso); use outra conta admin pra isso.
    if (actingUserId === id && (demotesFromAdmin || deactivates)) {
      throw AppError.forbidden('Você não pode alterar o próprio papel nem desativar a própria conta');
    }

    // Nunca deixar o sistema sem nenhum administrador ativo.
    if ((demotesFromAdmin || (deactivates && user.global_role === 'admin')) &&
        (await UserModel.countActiveAdminsExcept(id)) === 0) {
      throw new AppError('Não é possível remover o último administrador ativo do sistema', 409);
    }

    if (changes.email && changes.email !== user.email) {
      const existing = await UserModel.findByEmail(changes.email);
      if (existing) {
        throw AppError.conflict('Já existe um usuário com este e-mail');
      }
    }
    const updated = await UserModel.update(id, changes);
    return sanitize(updated);
  },
};
