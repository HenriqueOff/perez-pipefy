import { ChecklistItemModel } from '../models/checklistItem.model';
import { AppError } from '../utils/AppError';
import { assertCardInPipeline } from '../utils/assertOwnership';
import { sanitizeText } from '../utils/sanitizeText';

export const ChecklistItemService = {
  async listByCard(cardId: number, pipelineId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    return ChecklistItemModel.listByCard(cardId);
  },

  async create(cardId: number, pipelineId: number, rawTitle: string) {
    await assertCardInPipeline(cardId, pipelineId);
    const title = await sanitizeText(rawTitle);
    if (!title) {
      throw new AppError('Título do item não pode ficar vazio', 422);
    }
    const existing = await ChecklistItemModel.listByCard(cardId);
    return ChecklistItemModel.create({ card_id: cardId, title, position: existing.length });
  },

  async update(itemId: number, pipelineId: number, changes: { title?: string; done?: boolean; position?: number }) {
    const item = await ChecklistItemModel.findById(itemId);
    if (!item) {
      throw AppError.notFound('Item não encontrado');
    }
    await assertCardInPipeline(item.card_id, pipelineId);
    if (changes.title !== undefined) {
      const title = await sanitizeText(changes.title);
      if (!title) {
        throw new AppError('Título do item não pode ficar vazio', 422);
      }
      changes = { ...changes, title };
    }
    return ChecklistItemModel.update(itemId, changes);
  },

  async delete(itemId: number, pipelineId: number) {
    const item = await ChecklistItemModel.findById(itemId);
    if (!item) {
      throw AppError.notFound('Item não encontrado');
    }
    await assertCardInPipeline(item.card_id, pipelineId);
    return ChecklistItemModel.delete(itemId);
  },
};
