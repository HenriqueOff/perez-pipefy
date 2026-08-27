import { ContractTemplateModel } from '../models/contractTemplate.model';
import { PipelineModel } from '../models/pipeline.model';
import { CardModel } from '../models/card.model';
import { loadCardFieldsByKey } from './automation.service';
import { interpolateTemplate } from '../utils/templateInterpolation';
import { AppError } from '../utils/AppError';

function wrapPrintableDocument(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 780px; margin: 48px auto; padding: 0 24px; line-height: 1.6; }
      @media print { body { margin: 0 auto; } }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

export const ContractTemplateService = {
  listByPipeline(pipelineId: number) {
    return ContractTemplateModel.listByPipeline(pipelineId);
  },

  async create(pipelineId: number, input: { name: string; body_html: string }) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return ContractTemplateModel.create({ pipeline_id: pipelineId, ...input });
  },

  async update(templateId: number, pipelineId: number, changes: { name?: string; body_html?: string }) {
    const template = await ContractTemplateModel.findById(templateId);
    if (!template || template.pipeline_id !== pipelineId) {
      throw AppError.notFound('Modelo de contrato não encontrado');
    }
    return ContractTemplateModel.update(templateId, changes);
  },

  async delete(templateId: number, pipelineId: number) {
    const template = await ContractTemplateModel.findById(templateId);
    if (!template || template.pipeline_id !== pipelineId) {
      throw AppError.notFound('Modelo de contrato não encontrado');
    }
    return ContractTemplateModel.delete(templateId);
  },

  async generate(cardId: number, pipelineId: number, templateId: number): Promise<string> {
    const card = await CardModel.findById(cardId);
    if (!card || card.pipeline_id !== pipelineId) {
      throw AppError.notFound('Card não encontrado');
    }

    const template = await ContractTemplateModel.findById(templateId);
    if (!template || template.pipeline_id !== pipelineId) {
      throw AppError.notFound('Modelo de contrato não encontrado');
    }

    const valuesByKey = await loadCardFieldsByKey(cardId, pipelineId, card.title);
    const bodyHtml = interpolateTemplate(template.body_html, { title: card.title, fields: valuesByKey });
    return wrapPrintableDocument(bodyHtml, template.name);
  },
};
