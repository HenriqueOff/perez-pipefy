import { EmailTemplateModel } from '../models/emailTemplate.model';
import { PipelineModel } from '../models/pipeline.model';
import { AppError } from '../utils/AppError';

export const EmailTemplateService = {
  listByPipeline(pipelineId: number) {
    return EmailTemplateModel.listByPipeline(pipelineId);
  },

  async create(pipelineId: number, input: { name: string; subject: string; body_html: string }) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return EmailTemplateModel.create({ pipeline_id: pipelineId, ...input });
  },

  async update(
    templateId: number,
    pipelineId: number,
    changes: { name?: string; subject?: string; body_html?: string }
  ) {
    const template = await EmailTemplateModel.findById(templateId);
    if (!template || template.pipeline_id !== pipelineId) {
      throw AppError.notFound('Modelo de e-mail não encontrado');
    }
    return EmailTemplateModel.update(templateId, changes);
  },

  async delete(templateId: number, pipelineId: number) {
    const template = await EmailTemplateModel.findById(templateId);
    if (!template || template.pipeline_id !== pipelineId) {
      throw AppError.notFound('Modelo de e-mail não encontrado');
    }
    return EmailTemplateModel.delete(templateId);
  },
};
