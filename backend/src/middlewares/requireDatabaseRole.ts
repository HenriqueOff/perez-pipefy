import { NextFunction, Request, Response } from 'express';
import { DatabaseModel } from '../models/database.model';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { ROLE_LEVEL } from '../utils/pipelineRole';

/**
 * Exige que o usuário seja membro do database (na rota como :databaseId) com papel igual
 * ou superior ao mínimo informado — mesmo critério de requirePipelineRole.ts. Admins
 * globais sempre passam, sem precisar ser membro (é o que permite um admin se
 * autoadicionar; um usuário comum sem membership nenhuma nunca passa por aqui).
 */
export function requireDatabaseRole(minimumRole: PipelineRole) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    if (req.user.role === 'admin') {
      next();
      return;
    }

    const databaseId = Number(req.params.databaseId);
    if (!databaseId) {
      throw AppError.notFound('Database não encontrado');
    }

    const membership = await DatabaseModel.findMembership(databaseId, req.user.id);
    if (!membership || ROLE_LEVEL[membership.database_role] < ROLE_LEVEL[minimumRole]) {
      throw AppError.forbidden('Você não tem permissão para este database');
    }

    next();
  });
}
