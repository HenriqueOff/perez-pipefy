import { Request, Response } from 'express';
import { LabelService } from '../services/label.service';

export const LabelController = {
  async list(req: Request, res: Response) {
    res.json(await LabelService.listByPipeline(Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    const label = await LabelService.create(Number(req.params.pipelineId), req.body);
    res.status(201).json(label);
  },

  async update(req: Request, res: Response) {
    res.json(await LabelService.update(Number(req.params.labelId), Number(req.params.pipelineId), req.body));
  },

  async remove(req: Request, res: Response) {
    await LabelService.delete(Number(req.params.labelId), Number(req.params.pipelineId));
    res.status(204).send();
  },

  async attach(req: Request, res: Response) {
    const labels = await LabelService.attachToCard(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      req.body.label_id
    );
    res.status(201).json(labels);
  },

  async detach(req: Request, res: Response) {
    const labels = await LabelService.detachFromCard(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      Number(req.params.labelId)
    );
    res.json(labels);
  },
};
