import { Request, Response } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { StorageService } from '../services/storage.service';
import { AppError } from '../utils/AppError';

export const AttachmentController = {
  async list(req: Request, res: Response) {
    res.json(await AttachmentService.listByCard(Number(req.params.cardId), Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError('Nenhum arquivo enviado', 422);
    }
    const attachment = await AttachmentService.create(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      req.user!.id,
      req.file
    );
    res.status(201).json(attachment);
  },

  async download(req: Request, res: Response) {
    const attachment = await AttachmentService.findForCard(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      Number(req.params.attachmentId)
    );
    await StorageService.respondWithFile(res, attachment.file_path, attachment.file_name);
  },

  async remove(req: Request, res: Response) {
    await AttachmentService.delete(Number(req.params.attachmentId), Number(req.params.pipelineId));
    res.status(204).send();
  },
};
