import { Request, Response } from 'express';
import { PublicFormService } from '../services/publicForm.service';

export const PublicFormController = {
  async manageInfo(req: Request, res: Response) {
    res.json(await PublicFormService.getManageInfo(Number(req.params.pipelineId)));
  },

  async enable(req: Request, res: Response) {
    res.json(await PublicFormService.enable(Number(req.params.pipelineId)));
  },

  async disable(req: Request, res: Response) {
    res.json(await PublicFormService.disable(Number(req.params.pipelineId)));
  },

  async regenerate(req: Request, res: Response) {
    res.json(await PublicFormService.regenerateToken(Number(req.params.pipelineId)));
  },

  async publicSchema(req: Request, res: Response) {
    res.json(await PublicFormService.getPublicSchema(req.params.token));
  },

  async publicSubmit(req: Request, res: Response) {
    // Honeypot preenchido: finge sucesso sem tocar o banco (ver o schema pra mais contexto).
    if (typeof req.body.website === 'string' && req.body.website.trim() !== '') {
      res.status(201).json({ id: 0 });
      return;
    }
    const card = await PublicFormService.submit(req.params.token, req.body);
    res.status(201).json({ id: card.id });
  },
};
