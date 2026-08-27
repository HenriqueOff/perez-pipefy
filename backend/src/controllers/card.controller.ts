import { Request, Response } from 'express';
import { CardService } from '../services/card.service';
import { SearchService } from '../services/search.service';
import { ContractTemplateService } from '../services/contractTemplate.service';

export const CardController = {
  async list(req: Request, res: Response) {
    res.json(await CardService.listByPipeline(Number(req.params.pipelineId), req.user!.id));
  },

  async searchConnectable(req: Request, res: Response) {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const exclude = typeof req.query.exclude === 'string' ? req.query.exclude : '';
    const excludeCardIds = exclude
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
    res.json(await SearchService.searchCardsInPipeline(Number(req.params.pipelineId), query, excludeCardIds));
  },

  async detail(req: Request, res: Response) {
    res.json(await CardService.getDetail(Number(req.params.cardId), Number(req.params.pipelineId), req.user!.id));
  },

  async create(req: Request, res: Response) {
    const card = await CardService.create(Number(req.params.pipelineId), req.user!.id, req.body);
    res.status(201).json(card);
  },

  async update(req: Request, res: Response) {
    res.json(
      await CardService.update(Number(req.params.cardId), Number(req.params.pipelineId), req.user!.id, req.body)
    );
  },

  async move(req: Request, res: Response) {
    const card = await CardService.move(Number(req.params.cardId), req.user!.id, req.body.to_phase_id, req.body.position);
    res.json(card);
  },

  async updateFields(req: Request, res: Response) {
    res.json(await CardService.updateFields(Number(req.params.cardId), req.user!.id, req.body.fields));
  },

  async addAssignee(req: Request, res: Response) {
    const assignees = await CardService.addAssignee(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      req.body.user_id,
      req.user!.id
    );
    res.status(201).json(assignees);
  },

  async removeAssignee(req: Request, res: Response) {
    const assignees = await CardService.removeAssignee(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      Number(req.params.userId),
      req.user!.id
    );
    res.json(assignees);
  },

  async remove(req: Request, res: Response) {
    await CardService.delete(Number(req.params.cardId), Number(req.params.pipelineId));
    res.status(204).send();
  },

  async generateContract(req: Request, res: Response) {
    const html = await ContractTemplateService.generate(
      Number(req.params.cardId),
      Number(req.params.pipelineId),
      Number(req.params.templateId)
    );
    res.type('html').send(html);
  },
};
