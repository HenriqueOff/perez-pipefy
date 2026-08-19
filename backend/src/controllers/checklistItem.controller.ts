import { Request, Response } from 'express';
import { ChecklistItemService } from '../services/checklistItem.service';

export const ChecklistItemController = {
  async list(req: Request, res: Response) {
    res.json(await ChecklistItemService.listByCard(Number(req.params.cardId)));
  },

  async create(req: Request, res: Response) {
    const item = await ChecklistItemService.create(Number(req.params.cardId), req.body.title);
    res.status(201).json(item);
  },

  async update(req: Request, res: Response) {
    res.json(await ChecklistItemService.update(Number(req.params.itemId), req.body));
  },

  async remove(req: Request, res: Response) {
    await ChecklistItemService.delete(Number(req.params.itemId));
    res.status(204).send();
  },
};
