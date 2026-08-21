import { Request, Response } from 'express';
import { PipelineConnectionService } from '../services/pipelineConnection.service';

export const PipelineConnectionController = {
  async list(req: Request, res: Response) {
    res.json(await PipelineConnectionService.listByPipeline(Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    const connection = await PipelineConnectionService.create(Number(req.params.pipelineId), req.body);
    res.status(201).json(connection);
  },

  async remove(req: Request, res: Response) {
    await PipelineConnectionService.delete(Number(req.params.connectionId));
    res.status(204).send();
  },
};
