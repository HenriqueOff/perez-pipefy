import crypto from 'node:crypto';
import { PipelineModel } from '../models/pipeline.model';
import { PhaseModel } from '../models/phase.model';
import { CustomFieldModel } from '../models/customField.model';
import { CardService } from './card.service';
import { AppError } from '../utils/AppError';

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

async function resolveInitialPhaseFields(token: string) {
  const pipeline = await PipelineModel.findByPublicFormToken(token);
  if (!pipeline) {
    throw AppError.notFound('Formulário não encontrado ou desativado');
  }
  const phases = await PhaseModel.listByPipeline(pipeline.id);
  const initialPhase = phases.find((p) => p.is_initial) ?? phases[0];
  if (!initialPhase) {
    throw AppError.notFound('Este pipeline ainda não está pronto para receber cards');
  }
  const fields = await CustomFieldModel.listByPhase(initialPhase.id);
  return { pipeline, initialPhase, fields };
}

export const PublicFormService = {
  async getManageInfo(pipelineId: number) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return { enabled: pipeline.public_form_enabled, token: pipeline.public_form_token };
  },

  async enable(pipelineId: number) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const token = pipeline.public_form_token ?? generateToken();
    const updated = await PipelineModel.setPublicForm(pipelineId, { public_form_token: token, public_form_enabled: true });
    return { enabled: updated.public_form_enabled, token: updated.public_form_token };
  },

  async disable(pipelineId: number) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const updated = await PipelineModel.setPublicForm(pipelineId, { public_form_enabled: false });
    return { enabled: updated.public_form_enabled, token: updated.public_form_token };
  },

  async regenerateToken(pipelineId: number) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const updated = await PipelineModel.setPublicForm(pipelineId, {
      public_form_token: generateToken(),
      public_form_enabled: pipeline.public_form_enabled,
    });
    return { enabled: updated.public_form_enabled, token: updated.public_form_token };
  },

  async getPublicSchema(token: string) {
    const { pipeline, fields } = await resolveInitialPhaseFields(token);
    return {
      pipeline_name: pipeline.name,
      // campos com qualquer restrição de papel (min_view_role/min_edit_role) nunca
      // aparecem pro público — não é uma checagem de papel, é "isso é interno".
      fields: fields
        .filter((f) => f.min_view_role == null && f.min_edit_role == null)
        .map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          options: f.options,
          required: f.required,
        })),
    };
  },

  async submit(token: string, input: { title: string; fields?: Record<string, unknown> }) {
    const { pipeline, fields } = await resolveInitialPhaseFields(token);

    const publicFields = fields.filter((f) => f.min_view_role == null && f.min_edit_role == null);

    // um formulário público não tem uma etapa posterior de "preencher antes de mover":
    // os campos obrigatórios precisam ser exigidos já na submissão.
    const submitted = input.fields ?? {};
    const missing = publicFields.filter((f) => {
      if (!f.required) return false;
      const value = submitted[f.key];
      return value === null || value === undefined || value === '';
    });
    if (missing.length > 0) {
      throw new AppError(`Preencha os campos obrigatórios: ${missing.map((f) => f.label).join(', ')}`, 422);
    }

    // descarta silenciosamente qualquer valor submetido pra campo restrito (nunca deveria
    // chegar aqui via o formulário de verdade, já que getPublicSchema não os expõe — mas
    // uma chamada direta à API não pode conseguir escrever neles mesmo assim).
    const allowedKeys = new Set(publicFields.map((f) => f.key));
    const filteredFields = Object.fromEntries(
      Object.entries(input.fields ?? {}).filter(([key]) => allowedKeys.has(key))
    );

    // atribuído a quem criou o pipeline: não existe um usuário "anônimo" no schema
    // e card_history/cards.created_by exigem um usuário válido.
    // enforceManualCreationFlag: false — a trava "criar card manualmente" é sobre o botão
    // "+ Novo card" no board; submissão via formulário público é justamente um dos fluxos
    // que essa trava existe para preservar (ver migration 20260824090000).
    return CardService.create(
      pipeline.id,
      pipeline.created_by,
      { title: input.title, fields: filteredFields },
      { enforceManualCreationFlag: false }
    );
  },
};
