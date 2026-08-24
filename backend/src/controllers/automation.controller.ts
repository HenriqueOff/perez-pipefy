import { Request, Response } from 'express';
import { AutomationService } from '../services/automation.service';

export const AutomationController = {
  async list(req: Request, res: Response) {
    res.json(await AutomationService.listByPipeline(Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    const automation = await AutomationService.create(Number(req.params.pipelineId), req.body);
    res.status(201).json(automation);
  },

  async update(req: Request, res: Response) {
    res.json(
      await AutomationService.update(Number(req.params.automationId), Number(req.params.pipelineId), req.body)
    );
  },

  async remove(req: Request, res: Response) {
    await AutomationService.delete(Number(req.params.automationId), Number(req.params.pipelineId));
    res.status(204).send();
  },
};
