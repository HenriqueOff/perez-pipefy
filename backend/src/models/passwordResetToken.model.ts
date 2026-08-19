import { db } from '../config/db';
import { PasswordResetTokenRow } from '../types/entities';

const TABLE = 'password_reset_tokens';

export const PasswordResetTokenModel = {
  create(user_id: number, token_hash: string, expires_at: Date) {
    return db<PasswordResetTokenRow>(TABLE)
      .insert({ user_id, token_hash, expires_at })
      .returning('*')
      .then((rows) => rows[0]);
  },

  findValidByHash(token_hash: string) {
    return db<PasswordResetTokenRow>(TABLE)
      .where({ token_hash })
      .whereNull('used_at')
      .where('expires_at', '>', db.fn.now())
      .first();
  },

  markUsed(id: number) {
    return db<PasswordResetTokenRow>(TABLE).where({ id }).update({ used_at: db.fn.now() });
  },

  invalidateAllForUser(user_id: number) {
    return db<PasswordResetTokenRow>(TABLE).where({ user_id }).whereNull('used_at').update({ used_at: db.fn.now() });
  },
};
