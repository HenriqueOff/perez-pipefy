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
  list() {
    return UserModel.list();
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
    });
    return sanitize(user);
  },

  async update(id: number, changes: { name?: string; email?: string; global_role?: GlobalRole; active?: boolean }) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound('Usuário não encontrado');
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
