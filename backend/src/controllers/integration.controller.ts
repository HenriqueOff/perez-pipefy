import { Request, Response } from 'express';
import { IntegrationConfigService } from '../services/integrationConfig.service';
import { ImoviewSyncService } from '../integrations/imoview/imoviewSync.service';

export const IntegrationController = {
  async getImoviewConfig(_req: Request, res: Response) {
    const config = await IntegrationConfigService.getImoviewConfig();
    res.json(config ?? { configured: false });
  },

  async upsertImoviewConfig(req: Request, res: Response) {
    const config = await IntegrationConfigService.upsertImoviewConfig(req.body, req.user!.id);
    const { credentials_encrypted, ...safe } = config;
    void credentials_encrypted;
    res.status(201).json(safe);
  },

  async importCardFromImoview(req: Request, res: Response) {
    const card = await ImoviewSyncService.importCardFromImoview({
      entityType: req.body.external_type,
      externalId: req.body.external_id,
      pipelineId: req.body.pipeline_id,
      phaseId: req.body.phase_id,
      userId: req.user!.id,
    });
    res.status(201).json(card);
  },
};
