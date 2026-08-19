import { NextFunction, Request, Response } from 'express';
import { PipelineModel } from '../models/pipeline.model';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const ROLE_LEVEL: Record<PipelineRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
  owner: 4,
};

/**
 * Exige que o usuário seja membro do pipeline (na rota como :pipelineId) com papel igual ou
 * superior ao mínimo informado, seguindo a hierarquia owner > manager > editor > viewer.
 * Admins globais sempre passam, sem precisar ser membro.
 */
export function requirePipelineRole(minimumRole: PipelineRole) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    if (req.user.role === 'admin') {
      next();
      return;
    }

    const pipelineId = Number(req.params.pipelineId);
    if (!pipelineId) {
      throw AppError.notFound('Pipeline não encontrado');
    }

    const membership = await PipelineModel.findMembership(pipelineId, req.user.id);
    if (!membership || ROLE_LEVEL[membership.pipeline_role] < ROLE_LEVEL[minimumRole]) {
      throw AppError.forbidden('Você não tem permissão para este pipeline');
    }

    next();
  });
}
