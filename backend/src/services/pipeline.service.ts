import { db } from '../config/db';
import { CardModel } from '../models/card.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { PipelineModel } from '../models/pipeline.model';
import { PhaseModel } from '../models/phase.model';
import { CustomFieldModel } from '../models/customField.model';
import { DatabaseModel } from '../models/database.model';
import { UserModel } from '../models/user.model';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';
import { resolveActorRole, roleAtLeast } from '../utils/pipelineRole';
import { PIPELINE_TEMPLATES } from '../utils/pipelineTemplates';
import { FormulaFieldService } from './formulaField.service';

const RECENT_ACTIVITY_LIMIT = 15;

export const PipelineService = {
  listForUser(userId: number) {
    return PipelineModel.listForUser(userId);
  },

  async getOverviewForUser(userId: number) {
    const pipelines = await PipelineModel.listForUser(userId);
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
    const [phases, members, actorRole, allCustomFields] = await Promise.all([
      PhaseModel.listByPipeline(pipelineId),
      PipelineModel.listMembers(pipelineId),
      resolveActorRole(pipelineId, userId),
      // Uma consulta só para os campos de todas as fases (já vem ordenada por
      // phase_id, position), no lugar de um listByPhase por fase.
      CustomFieldModel.listByPipeline(pipelineId),
    ]);

    const fieldsByPhase = new Map<number, typeof allCustomFields>();
    for (const field of allCustomFields) {
      if (!roleAtLeast(actorRole, field.min_view_role ?? 'viewer')) continue;
      const list = fieldsByPhase.get(field.phase_id) ?? [];
      list.push(field);
      fieldsByPhase.set(field.phase_id, list);
    }
    const phasesWithFields = phases.map((phase) => ({
      ...phase,
      customFields: fieldsByPhase.get(phase.id) ?? [],
    }));

    return { ...pipeline, phases: phasesWithFields, members };
  },

  /** Aba "Atividade recente" na home quando o usuário é admin geral — log do sistema
   * inteiro, sem o filtro de membership que getOverviewForUser aplica. */
  getSystemActivity(limit: number, offset: number) {
    return CardHistoryModel.listAllRecent(limit, offset);
  },

  // --- painel admin-only (engrenagem no board; ver requireGlobalRole('admin') nas rotas) ---

  async getAuditLog(pipelineId: number, limit: number, offset: number) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return CardHistoryModel.listByPipeline(pipelineId, limit, offset);
  },

  async getAdminInfo(pipelineId: number) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }

    const count = (table: string, where: Record<string, unknown>) =>
      db(table)
        .where(where)
        .count<{ count: string }[]>('* as count')
        .first()
        .then((row) => Number(row?.count ?? 0));

    const [
      creator,
      cardsCount,
      phasesCount,
      customFieldsCount,
      automationsCount,
      labelsCount,
      membersCount,
      emailTemplatesCount,
      connectionsCount,
    ] = await Promise.all([
      UserModel.findById(pipeline.created_by),
      count('cards', { pipeline_id: pipelineId }),
      count('phases', { pipeline_id: pipelineId }),
      db('custom_fields')
        .join('phases', 'phases.id', 'custom_fields.phase_id')
        .where('phases.pipeline_id', pipelineId)
        .count<{ count: string }[]>('custom_fields.id as count')
        .first()
        .then((row) => Number(row?.count ?? 0)),
      count('automations', { pipeline_id: pipelineId }),
      count('labels', { pipeline_id: pipelineId }),
      count('pipeline_members', { pipeline_id: pipelineId }),
      count('email_templates', { pipeline_id: pipelineId }),
      db('pipeline_connections')
        .where('owner_pipeline_id', pipelineId)
        .orWhere('target_pipeline_id', pipelineId)
        .count<{ count: string }[]>('* as count')
        .first()
        .then((row) => Number(row?.count ?? 0)),
    ]);

    return {
      id: pipeline.id,
      archived: pipeline.archived,
      public_form_enabled: pipeline.public_form_enabled,
      pipefy_pipe_id: pipeline.pipefy_pipe_id ?? null,
      created_at: pipeline.created_at,
      created_by_name: creator?.name ?? null,
      counts: {
        cards: cardsCount,
        phases: phasesCount,
        customFields: customFieldsCount,
        automations: automationsCount,
        labels: labelsCount,
        members: membersCount,
        emailTemplates: emailTemplatesCount,
        connections: connectionsCount,
      },
    };
  },

  async create(input: { name: string; description?: string; created_by: number; template?: string }) {
    const pipeline = await PipelineModel.create({
      name: input.name,
      description: input.description ?? null,
      created_by: input.created_by,
    });
    // criador vira owner automaticamente
    await PipelineModel.addMember(pipeline.id, input.created_by, 'owner');

    const template = input.template ? PIPELINE_TEMPLATES[input.template] : undefined;
    if (template) {
      for (const [position, phase] of template.phases.entries()) {
        await PhaseModel.create({
          pipeline_id: pipeline.id,
          name: phase.name,
          position,
          color: phase.color ?? null,
          is_initial: position === 0,
          is_final: position === template.phases.length - 1,
          sla_hours: null,
          wip_limit: null,
          min_move_in_role: null,
          min_move_out_role: null,
        });
      }
    }

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

  async setPhaseManualCardCreation(phaseId: number, allow: boolean) {
    const phase = await PhaseModel.findById(phaseId);
    if (!phase) {
      throw AppError.notFound('Fase não encontrada');
    }
    return PhaseModel.setAllowManualCardCreation(phaseId, allow);
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
      linked_database_id?: number;
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
    if (input.type === 'database_link') {
      if (!input.linked_database_id) {
        throw new AppError('Campos de conexão com database precisam de um database selecionado', 422);
      }
      const linkedDatabase = await DatabaseModel.findById(input.linked_database_id);
      if (!linkedDatabase) {
        throw AppError.notFound('Database selecionado não encontrado');
      }
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
      linked_database_id: input.type === 'database_link' ? input.linked_database_id ?? null : null,
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
