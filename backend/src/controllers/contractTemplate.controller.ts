import { Request, Response } from 'express';
import { ContractTemplateService } from '../services/contractTemplate.service';

export const ContractTemplateController = {
  async list(req: Request, res: Response) {
    res.json(await ContractTemplateService.listByPipeline(Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    const template = await ContractTemplateService.create(Number(req.params.pipelineId), req.body);
    res.status(201).json(template);
  },

  async update(req: Request, res: Response) {
    res.json(
      await ContractTemplateService.update(Number(req.params.templateId), Number(req.params.pipelineId), req.body)
    );
  },

  async remove(req: Request, res: Response) {
    await ContractTemplateService.delete(Number(req.params.templateId), Number(req.params.pipelineId));
    res.status(204).send();
  },
};
