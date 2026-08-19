import { NextFunction, Request, Response } from 'express';
import { GlobalRole } from '../types/enums';
import { AppError } from '../utils/AppError';

export function requireGlobalRole(...roles: GlobalRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden();
    }
    next();
  };
}
