import { PipelineModel } from '../models/pipeline.model';
import { UserModel } from '../models/user.model';
import { PipelineRole } from '../types/enums';

export const ROLE_LEVEL: Record<PipelineRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
  owner: 4,
};

export function roleAtLeast(role: PipelineRole, minimum: PipelineRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}

/**
 * Resolve o papel efetivo de um usuário num pipeline: admin global sempre vira 'owner'
 * (mesmo bypass já usado por requirePipelineRole), senão o papel da membership; sem
 * membership (não deveria acontecer além desse ponto, já barrado nas rotas) cai pra
 * 'viewer' defensivamente.
 */
export async function resolveActorRole(pipelineId: number, userId: number): Promise<PipelineRole> {
  const user = await UserModel.findById(userId);
  if (user?.global_role === 'admin') return 'owner';
  const membership = await PipelineModel.findMembership(pipelineId, userId);
  return membership?.pipeline_role ?? 'viewer';
}
