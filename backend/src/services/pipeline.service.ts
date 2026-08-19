import { PipelineModel } from '../models/pipeline.model';
import { PhaseModel } from '../models/phase.model';
import { CustomFieldModel } from '../models/customField.model';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';

export const PipelineService = {
  listForUser(userId: number, isAdmin: boolean) {
    return PipelineModel.listForUser(userId, isAdmin);
  },

  async getDetail(pipelineId: number) {
    const pipeline = await PipelineModel.findSafeById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const [phases, members] = await Promise.all([
      PhaseModel.listByPipeline(pipelineId),
      PipelineModel.listMembers(pipelineId),
    ]);

    const phasesWithFields = await Promise.all(
      phases.map(async (phase) => ({
        ...phase,
        customFields: await CustomFieldModel.listByPhase(phase.id),
      }))
    );

    return { ...pipeline, phases: phasesWithFields, members };
  },

  async create(input: { name: string; description?: string; created_by: number }) {
    const pipeline = await PipelineModel.create({
      name: input.name,
      description: input.description ?? null,
      created_by: input.created_by,
    });
    // criador vira owner automaticamente
    await PipelineModel.addMember(pipeline.id, input.created_by, 'owner');
    return pipeline;
  },

  async update(pipelineId: number, changes: { name?: string; description?: string | null; archived?: boolean }) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return PipelineModel.update(pipelineId, changes);
  },

  async addMember(pipelineId: number, userId: number, role: PipelineRole) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return PipelineModel.addMember(pipelineId, userId, role);
  },

  async removeMember(pipelineId: number, userId: number) {
    return PipelineModel.removeMember(pipelineId, userId);
  },

  // --- phases ---

  async createPhase(
    pipelineId: number,
    input: {
      name: string;
      position?: number;
      color?: string;
      is_initial?: boolean;
      is_final?: boolean;
      sla_hours?: number | null;
      wip_limit?: number | null;
    }
  ) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }

    let position = input.position;
    if (position === undefined) {
      const existing = await PhaseModel.listByPipeline(pipelineId);
      position = existing.length;
    }

    return PhaseModel.create({
      pipeline_id: pipelineId,
      name: input.name,
      position,
      color: input.color ?? null,
      is_initial: input.is_initial ?? false,
      is_final: input.is_final ?? false,
      sla_hours: input.sla_hours ?? null,
      wip_limit: input.wip_limit ?? null,
    });
  },

  async updatePhase(
    phaseId: number,
    changes: {
      name?: string;
      position?: number;
      color?: string | null;
      is_initial?: boolean;
      is_final?: boolean;
      sla_hours?: number | null;
      wip_limit?: number | null;
    }
  ) {
    const phase = await PhaseModel.findById(phaseId);
    if (!phase) {
      throw AppError.notFound('Fase não encontrada');
    }
    return PhaseModel.update(phaseId, changes);
  },

  async deletePhase(phaseId: number) {
    const phase = await PhaseModel.findById(phaseId);
    if (!phase) {
      throw AppError.notFound('Fase não encontrada');
    }
    const { count } = (await PhaseModel.countCards(phaseId)) ?? { count: '0' };
    if (Number(count) > 0) {
      throw new AppError('Não é possível excluir uma fase que possui cards. Mova os cards antes.', 409);
    }
    return PhaseModel.delete(phaseId);
  },

  // --- custom fields ---

  async createCustomField(
    phaseId: number,
    input: { label: string; key: string; type: string; options?: string[]; required?: boolean; position?: number }
  ) {
    const phase = await PhaseModel.findById(phaseId);
    if (!phase) {
      throw AppError.notFound('Fase não encontrada');
    }

    if ((input.type === 'select') && (!input.options || input.options.length === 0)) {
      throw new AppError('Campos do tipo select precisam de ao menos uma opção', 422);
    }

    let position = input.position;
    if (position === undefined) {
      const existing = await CustomFieldModel.listByPhase(phaseId);
      position = existing.length;
    }

    return CustomFieldModel.create({
      phase_id: phaseId,
      label: input.label,
      key: input.key,
      type: input.type as never,
      options: input.options ?? null,
      required: input.required ?? false,
      position,
    });
  },

  async updateCustomField(fieldId: number, changes: { label?: string; options?: string[]; required?: boolean; position?: number }) {
    const field = await CustomFieldModel.findById(fieldId);
    if (!field) {
      throw AppError.notFound('Campo não encontrado');
    }
    return CustomFieldModel.update(fieldId, changes);
  },

  async deleteCustomField(fieldId: number) {
    const field = await CustomFieldModel.findById(fieldId);
    if (!field) {
      throw AppError.notFound('Campo não encontrado');
    }
    return CustomFieldModel.delete(fieldId);
  },
};
