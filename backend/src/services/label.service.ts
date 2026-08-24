import { LabelModel } from '../models/label.model';
import { PipelineModel } from '../models/pipeline.model';
import { AppError } from '../utils/AppError';
import { assertCardInPipeline } from '../utils/assertOwnership';
import { sanitizeText } from '../utils/sanitizeText';

export const LabelService = {
  listByPipeline(pipelineId: number) {
    return LabelModel.listByPipeline(pipelineId);
  },

  async create(pipelineId: number, input: { name: string; color?: string }) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const name = await sanitizeText(input.name);
    if (!name) {
      throw new AppError('Nome da etiqueta não pode ficar vazio', 422);
    }
    const existing = await LabelModel.listByPipeline(pipelineId);
    if (existing.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      throw AppError.conflict('Já existe uma etiqueta com este nome neste pipeline');
    }
    return LabelModel.create({ pipeline_id: pipelineId, name, color: input.color });
  },

  async update(labelId: number, pipelineId: number, changes: { name?: string; color?: string }) {
    const label = await LabelModel.findById(labelId);
    if (!label || label.pipeline_id !== pipelineId) {
      throw AppError.notFound('Etiqueta não encontrada');
    }
    if (changes.name !== undefined) {
      const name = await sanitizeText(changes.name);
      if (!name) {
        throw new AppError('Nome da etiqueta não pode ficar vazio', 422);
      }
      changes = { ...changes, name };
    }
    if (changes.name && changes.name.toLowerCase() !== label.name.toLowerCase()) {
      const existing = await LabelModel.listByPipeline(label.pipeline_id);
      if (existing.some((l) => l.id !== labelId && l.name.toLowerCase() === changes.name!.toLowerCase())) {
        throw AppError.conflict('Já existe uma etiqueta com este nome neste pipeline');
      }
    }
    return LabelModel.update(labelId, changes);
  },

  async delete(labelId: number, pipelineId: number) {
    const label = await LabelModel.findById(labelId);
    if (!label || label.pipeline_id !== pipelineId) {
      throw AppError.notFound('Etiqueta não encontrada');
    }
    return LabelModel.delete(labelId);
  },

  async attachToCard(cardId: number, pipelineId: number, labelId: number) {
    const card = await assertCardInPipeline(cardId, pipelineId);
    const label = await LabelModel.findById(labelId);
    if (!label || label.pipeline_id !== card.pipeline_id) {
      throw AppError.notFound('Etiqueta não encontrada neste pipeline');
    }
    await LabelModel.attachToCard(cardId, labelId);
    return LabelModel.listByCard(cardId);
  },

  async detachFromCard(cardId: number, pipelineId: number, labelId: number) {
    const card = await assertCardInPipeline(cardId, pipelineId);
    const label = await LabelModel.findById(labelId);
    if (!label || label.pipeline_id !== card.pipeline_id) {
      throw AppError.notFound('Etiqueta não encontrada neste pipeline');
    }
    await LabelModel.detachFromCard(cardId, labelId);
    return LabelModel.listByCard(cardId);
  },
};
