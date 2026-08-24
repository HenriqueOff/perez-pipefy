import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service';

export const CommentController = {
  async list(req: Request, res: Response) {
    res.json(await CommentService.listByCard(Number(req.params.cardId), Number(req.params.pipelineId)));
  },

  async create(req: Request, res: Response) {
    const comment = await CommentService.create(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      req.user!.id,
      req.body.body
    );
    res.status(201).json(comment);
  },

  async remove(req: Request, res: Response) {
    await CommentService.delete(
      Number(req.params.commentId),
      Number(req.params.pipelineId),
      req.user!.id,
      req.user!.role === 'admin'
    );
    res.status(204).send();
  },
};
