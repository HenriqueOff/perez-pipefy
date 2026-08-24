import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export const UserController = {
  async list(req: Request, res: Response) {
    res.json(await UserService.list(req.user!.role === 'admin'));
  },

  async create(req: Request, res: Response) {
    const user = await UserService.create(req.body);
    res.status(201).json(user);
  },

  async update(req: Request, res: Response) {
    const user = await UserService.update(Number(req.params.userId), req.body);
    res.json(user);
  },
};
