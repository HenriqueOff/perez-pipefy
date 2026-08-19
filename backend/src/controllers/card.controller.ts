import { Request, Response } from 'express';
import { CardService } from '../services/card.service';

export const CardController = {
  async list(req: Request, res: Response) {
    res.json(await CardService.listByPipeline(Number(req.params.pipelineId)));
  },

  async detail(req: Request, res: Response) {
    res.json(await CardService.getDetail(Number(req.params.cardId)));
  },

  async create(req: Request, res: Response) {
    const card = await CardService.create(Number(req.params.pipelineId), req.user!.id, req.body);
    res.status(201).json(card);
  },

  async update(req: Request, res: Response) {
    res.json(await CardService.update(Number(req.params.cardId), req.user!.id, req.body));
  },

  async move(req: Request, res: Response) {
    const card = await CardService.move(Number(req.params.cardId), req.user!.id, req.body.to_phase_id, req.body.position);
    res.json(card);
  },

  async updateFields(req: Request, res: Response) {
    res.json(await CardService.updateFields(Number(req.params.cardId), req.user!.id, req.body.fields));
  },

  async addAssignee(req: Request, res: Response) {
    const assignees = await CardService.addAssignee(Number(req.params.cardId), req.body.user_id, req.user!.id);
    res.status(201).json(assignees);
  },

  async removeAssignee(req: Request, res: Response) {
    const assignees = await CardService.removeAssignee(
      Number(req.params.cardId),
      Number(req.params.userId),
      req.user!.id
    );
    res.json(assignees);
  },

  async remove(req: Request, res: Response) {
    await CardService.delete(Number(req.params.cardId));
    res.status(204).send();
  },
};
