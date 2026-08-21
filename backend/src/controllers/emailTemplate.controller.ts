import { Request, Response } from 'express';
import { EmailTemplateService } from '../services/emailTemplate.service';

export const EmailTemplateController = {
  async list(req: Request, res: Response) {
    res.json(await EmailTemplateService.listByPipeline(Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    const template = await EmailTemplateService.create(Number(req.params.pipelineId), req.body);
    res.status(201).json(template);
  },

  async update(req: Request, res: Response) {
    res.json(await EmailTemplateService.update(Number(req.params.templateId), req.body));
  },

  async remove(req: Request, res: Response) {
    await EmailTemplateService.delete(Number(req.params.templateId));
    res.status(204).send();
  },
};
