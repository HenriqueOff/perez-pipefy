import { LabelModel } from '../models/label.model';
import { CardModel } from '../models/card.model';
import { PipelineModel } from '../models/pipeline.model';
import { AppError } from '../utils/AppError';

export const LabelService = {
  listByPipeline(pipelineId: number) {
    return LabelModel.listByPipeline(pipelineId);
  },

  async create(pipelineId: number, input: { name: string; color?: string }) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const existing = await LabelModel.listByPipeline(pipelineId);
    if (existing.some((l) => l.name.toLowerCase() === input.name.toLowerCase())) {
      throw AppError.conflict('Já existe uma etiqueta com este nome neste pipeline');
    }
    return LabelModel.create({ pipeline_id: pipelineId, name: input.name, color: input.color });
  },

  async update(labelId: number, changes: { name?: string; color?: string }) {
    const label = await LabelModel.findById(labelId);
    if (!label) {
      throw AppError.notFound('Etiqueta não encontrada');
    }
    if (changes.name && changes.name.toLowerCase() !== label.name.toLowerCase()) {
      const existing = await LabelModel.listByPipeline(label.pipeline_id);
      if (existing.some((l) => l.id !== labelId && l.name.toLowerCase() === changes.name!.toLowerCase())) {
        throw AppError.conflict('Já existe uma etiqueta com este nome neste pipeline');
      }
    }
    return LabelModel.update(labelId, changes);
  },

  async delete(labelId: number) {
    const label = await LabelModel.findById(labelId);
    if (!label) {
      throw AppError.notFound('Etiqueta não encontrada');
    }
    return LabelModel.delete(labelId);
  },

  async attachToCard(cardId: number, labelId: number) {
    const [card, label] = await Promise.all([CardModel.findById(cardId), LabelModel.findById(labelId)]);
    if (!card) {
      throw AppError.notFound('Card não encontrado');
    }
    if (!label || label.pipeline_id !== card.pipeline_id) {
      throw AppError.notFound('Etiqueta não encontrada neste pipeline');
    }
    await LabelModel.attachToCard(cardId, labelId);
    return LabelModel.listByCard(cardId);
  },

  async detachFromCard(cardId: number, labelId: number) {
    await LabelModel.detachFromCard(cardId, labelId);
    return LabelModel.listByCard(cardId);
  },
};
