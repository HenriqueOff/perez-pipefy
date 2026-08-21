import { CardModel } from '../models/card.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { PipelineModel } from '../models/pipeline.model';
import { PhaseModel } from '../models/phase.model';
import { CustomFieldModel } from '../models/customField.model';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';
import { resolveActorRole, roleAtLeast } from '../utils/pipelineRole';
import { FormulaFieldService } from './formulaField.service';

const RECENT_ACTIVITY_LIMIT = 15;

export const PipelineService = {
  listForUser(userId: number, isAdmin: boolean) {
    return PipelineModel.listForUser(userId, isAdmin);
  },

  async getOverviewForUser(userId: number, isAdmin: boolean) {
    const pipelines = await PipelineModel.listForUser(userId, isAdmin);
    const pipelineIds = pipelines.map((p) => p.id);

    const [stats, recentActivity] = await Promise.all([
      CardModel.aggregateStatsByPipelines(pipelineIds),
      CardHistoryModel.listRecentForPipelines(pipelineIds, RECENT_ACTIVITY_LIMIT),
    ]);
    const statsByPipeline = new Map(stats.map((s) => [s.pipeline_id, s]));

    return {
      pipelines: pipelines.map((p) => ({
        ...p,
        cardCount: statsByPipeline.get(p.id)?.total ?? 0,
        overdueCount: statsByPipeline.get(p.id)?.overdue ?? 0,
        slaBreachedCount: statsByPipeline.get(p.id)?.sla_breached ?? 0,
      })),
      recentActivity,
    };
  },

  async getDetail(pipelineId: number, userId: number) {
    const pipeline = await PipelineModel.findSafeById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    const [phases, members, actorRole] = await Promise.all([
      PhaseModel.listByPipeline(pipelineId),
      PipelineModel.listMembers(pipelineId),
      resolveActorRole(pipelineId, userId),
    ]);

    const phasesWithFields = await Promise.all(
      phases.map(async (phase) => ({
        ...phase,
        customFields: (await CustomFieldModel.listByPhase(phase.id)).filter((f) =>
          roleAtLeast(actorRole, f.min_view_role ?? 'viewer')
        ),
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
      min_move_in_role?: PipelineRole | null;
      min_move_out_role?: PipelineRole | null;
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
      min_move_in_role: input.min_move_in_role ?? null,
      min_move_out_role: input.min_move_out_role ?? null,
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
      min_move_in_role?: PipelineRole | null;
      min_move_out_role?: PipelineRole | null;
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
    input: {
      label: string;
      key: string;
      type: string;
      options?: string[];
      formula?: string;
      min_view_role?: PipelineRole | null;
      min_edit_role?: PipelineRole | null;
      required?: boolean;
      position?: number;
    }
  ) {
    const phase = await PhaseModel.findById(phaseId);
    if (!phase) {
      throw AppError.notFound('Fase não encontrada');
    }

    if ((input.type === 'select') && (!input.options || input.options.length === 0)) {
      throw new AppError('Campos do tipo select precisam de ao menos uma opção', 422);
    }
    if (input.type === 'formula') {
      if (!input.formula?.trim()) {
        throw new AppError('Campos do tipo fórmula precisam de uma expressão', 422);
      }
      await FormulaFieldService.validateFormula(phase.pipeline_id, input.key, input.formula);
    }
    if (!roleAtLeast(input.min_edit_role ?? 'editor', input.min_view_role ?? 'viewer')) {
      throw new AppError('O papel mínimo pra editar não pode ser menor que o papel mínimo pra ver o campo', 422);
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
      formula: input.type === 'formula' ? input.formula ?? null : null,
      min_view_role: input.min_view_role ?? null,
      min_edit_role: input.min_edit_role ?? null,
      required: input.required ?? false,
      position,
    });
  },

  async updateCustomField(
    fieldId: number,
    changes: {
      label?: string;
      options?: string[];
      formula?: string;
      min_view_role?: PipelineRole | null;
      min_edit_role?: PipelineRole | null;
      required?: boolean;
      position?: number;
    }
  ) {
    const field = await CustomFieldModel.findById(fieldId);
    if (!field) {
      throw AppError.notFound('Campo não encontrado');
    }
    if (field.type === 'formula' && changes.formula !== undefined) {
      if (!changes.formula.trim()) {
        throw new AppError('Campos do tipo fórmula precisam de uma expressão', 422);
      }
      const phase = await PhaseModel.findById(field.phase_id);
      await FormulaFieldService.validateFormula(phase!.pipeline_id, field.key, changes.formula, field.id);
    }
    if (changes.min_view_role !== undefined || changes.min_edit_role !== undefined) {
      const nextViewRole = changes.min_view_role !== undefined ? changes.min_view_role : field.min_view_role;
      const nextEditRole = changes.min_edit_role !== undefined ? changes.min_edit_role : field.min_edit_role;
      if (!roleAtLeast(nextEditRole ?? 'editor', nextViewRole ?? 'viewer')) {
        throw new AppError('O papel mínimo pra editar não pode ser menor que o papel mínimo pra ver o campo', 422);
      }
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
