import { DatabaseModel } from '../models/database.model';
import { UserModel } from '../models/user.model';
import { PipelineRole } from '../types/enums';

/** Mesma hierarquia de papéis usada em pipelines (owner > manager > editor > viewer). */
export { ROLE_LEVEL, roleAtLeast } from './pipelineRole';

/**
 * Resolve o papel efetivo de um usuário num database: admin global sempre vira 'owner'
 * (mesmo bypass de requireDatabaseRole/requirePipelineRole); sem membership cai pra
 * 'viewer' defensivamente (não deveria ser alcançável além desse ponto, já barrado nas
 * rotas por requireDatabaseRole).
 */
export async function resolveDatabaseActorRole(databaseId: number, userId: number): Promise<PipelineRole> {
  const user = await UserModel.findById(userId);
  if (user?.global_role === 'admin') return 'owner';
  const membership = await DatabaseModel.findMembership(databaseId, userId);
  return membership?.database_role ?? 'viewer';
}
