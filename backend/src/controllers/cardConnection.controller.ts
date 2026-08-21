import { Request, Response } from 'express';
import { CardConnectionService } from '../services/cardConnection.service';

export const CardConnectionController = {
  async list(req: Request, res: Response) {
    res.json(await CardConnectionService.listForCard(Number(req.params.cardId)));
  },

  async attach(req: Request, res: Response) {
    const connection = await CardConnectionService.attach(Number(req.params.cardId), req.body);
    res.status(201).json(connection);
  },

  async detach(req: Request, res: Response) {
    await CardConnectionService.detach(Number(req.params.cardConnectionId), Number(req.params.cardId));
    res.status(204).send();
  },
};
