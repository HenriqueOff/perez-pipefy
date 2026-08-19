import { ChecklistItemModel } from '../models/checklistItem.model';
import { CardModel } from '../models/card.model';
import { AppError } from '../utils/AppError';

export const ChecklistItemService = {
  listByCard(cardId: number) {
    return ChecklistItemModel.listByCard(cardId);
  },

  async create(cardId: number, title: string) {
    const card = await CardModel.findById(cardId);
    if (!card) {
      throw AppError.notFound('Card não encontrado');
    }
    const existing = await ChecklistItemModel.listByCard(cardId);
    return ChecklistItemModel.create({ card_id: cardId, title, position: existing.length });
  },

  async update(itemId: number, changes: { title?: string; done?: boolean; position?: number }) {
    const item = await ChecklistItemModel.findById(itemId);
    if (!item) {
      throw AppError.notFound('Item não encontrado');
    }
    return ChecklistItemModel.update(itemId, changes);
  },

  async delete(itemId: number) {
    const item = await ChecklistItemModel.findById(itemId);
    if (!item) {
      throw AppError.notFound('Item não encontrado');
    }
    return ChecklistItemModel.delete(itemId);
  },
};
