import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../src/models/user.model';

const DEFAULT_PASSWORD = '#821109ESgla';
const PLACEHOLDER_DOMAIN = 'pendente.perezimoveis.com';

let cachedPasswordHash: string | null = null;
const cache = new Map<string, number>();
export const createdPlaceholderAccounts: { name: string; placeholderEmail: string; realEmail: string }[] = [];

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Determinístico: o mesmo e-mail real do Pipefy sempre gera o mesmo e-mail placeholder,
 * então reexecutar o importador encontra a conta já criada em vez de duplicar. */
function derivePlaceholderEmail(realEmail: string): string {
  const hash = crypto.createHash('md5').update(realEmail.toLowerCase()).digest('hex').slice(0, 8);
  const local = slugify(realEmail.split('@')[0] || 'usuario');
  return `pipefy.${local}-${hash}@${PLACEHOLDER_DOMAIN}`;
}

/**
 * Resolve um autor do Pipefy (criador de card, autor de comentário) pra um user_id nosso.
 * Se já existe um usuário com o e-mail real, reaproveita. Senão, cria (ou reaproveita, se já
 * criada numa execução anterior) uma conta com o nome real, senha padrão e um e-mail
 * placeholder — combinado explicitamente com o usuário: ele corrige o e-mail depois pela
 * tela de administração.
 */
export async function resolveOrCreateUser(input: { name: string; email: string | null }): Promise<number> {
  const realEmail = (input.email ?? '').trim().toLowerCase();
  const name = input.name?.trim() || 'Sem nome (Pipefy)';
  const cacheKey = realEmail || `noemail:${slugify(name)}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (realEmail) {
    const existing = await UserModel.findByEmail(realEmail);
    if (existing) {
      cache.set(cacheKey, existing.id);
      return existing.id;
    }
  }

  const placeholderEmail = realEmail ? derivePlaceholderEmail(realEmail) : derivePlaceholderEmail(`sem-email-${slugify(name)}`);

  const existingPlaceholder = await UserModel.findByEmail(placeholderEmail);
  if (existingPlaceholder) {
    cache.set(cacheKey, existingPlaceholder.id);
    return existingPlaceholder.id;
  }

  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  }

  const created = await UserModel.create({
    name,
    email: placeholderEmail,
    password_hash: cachedPasswordHash,
    global_role: 'member',
  });

  createdPlaceholderAccounts.push({ name, placeholderEmail, realEmail: realEmail || '(sem e-mail no Pipefy)' });
  cache.set(cacheKey, created.id);
  return created.id;
}
