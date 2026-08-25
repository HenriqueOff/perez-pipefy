import { GlobalRole } from './enums';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: GlobalRole;
        mustChangePassword: boolean;
      };
    }
  }
}

export {};
