import { db } from '../config/db';
import { RefreshTokenRow } from '../types/entities';

const TABLE = 'refresh_tokens';

export const RefreshTokenModel = {
  create(user_id: number, token_hash: string, expires_at: Date, user_agent?: string | null) {
    return db<RefreshTokenRow>(TABLE)
      .insert({ user_id, token_hash, expires_at, user_agent: user_agent ?? null })
      .returning('*')
      .then((rows) => rows[0]);
  },

  findValidByHash(token_hash: string) {
    return db<RefreshTokenRow>(TABLE)
      .where({ token_hash })
      .whereNull('revoked_at')
      .where('expires_at', '>', db.fn.now())
      .first();
  },

  revoke(id: number) {
    return db<RefreshTokenRow>(TABLE).where({ id }).update({ revoked_at: db.fn.now() });
  },

  revokeAllForUser(user_id: number) {
    return db<RefreshTokenRow>(TABLE).where({ user_id }).whereNull('revoked_at').update({ revoked_at: db.fn.now() });
  },

  // "Sessões ativas" pro usuário — não revogadas e ainda não expiradas.
  listActiveForUser(user_id: number) {
    return db<RefreshTokenRow>(TABLE)
      .where({ user_id })
      .whereNull('revoked_at')
      .where('expires_at', '>', db.fn.now())
      .orderBy('created_at', 'desc')
      .select('id', 'token_hash', 'user_agent', 'created_at', 'expires_at');
  },

  findById(id: number) {
    return db<RefreshTokenRow>(TABLE).where({ id }).first();
  },
};
