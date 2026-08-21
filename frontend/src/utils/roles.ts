import { PipelineRole } from '../types';

export const ROLE_LEVEL: Record<PipelineRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
  owner: 4,
};

export function roleAtLeast(role: PipelineRole, minimum: PipelineRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimum];
}
