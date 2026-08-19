import { db } from '../config/db';
import { AutomationModel } from '../models/automation.model';
import { CardModel } from '../models/card.model';
import { CardAssigneeModel } from '../models/cardAssignee.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { LabelModel } from '../models/label.model';
import { PhaseModel } from '../models/phase.model';
import { PipelineModel } from '../models/pipeline.model';
import { UserModel } from '../models/user.model';
import { AutomationTriggerType } from '../types/enums';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';

type TriggerContext =
  | { type: 'card_created_in_phase'; cardId: number; phaseId: number }
  | { type: 'card_moved_to_phase'; cardId: number; fromPhaseId: number; toPhaseId: number }
  | { type: 'field_updated'; cardId: number; fieldId: number; value: unknown };

function matchesTrigger(config: Record<string, unknown> | null, context: TriggerContext): boolean {
  const cfg = config ?? {};
  switch (context.type) {
    case 'card_created_in_phase':
      return cfg.phase_id == null || Number(cfg.phase_id) === context.phaseId;
    case 'card_moved_to_phase':
      return Number(cfg.phase_id) === context.toPhaseId;
    case 'field_updated':
      if (Number(cfg.field_id) !== context.fieldId) return false;
      if (cfg.value === undefined || cfg.value === null) return true;
      return JSON.stringify(cfg.value) === JSON.stringify(context.value);
    default:
      return false;
  }
}

async function moveCardDirect(cardId: number, toPhaseId: number, userId: number) {
  const card = await CardModel.findById(cardId);
  if (!card || card.current_phase_id === toPhaseId) return;

  const targetPhase = await PhaseModel.findById(toPhaseId);
  if (!targetPhase || targetPhase.pipeline_id !== card.pipeline_id) {
    logger.warn({ cardId, toPhaseId }, 'Automação ignorada: fase de destino inválida para este pipeline');
    return;
  }

  await db.transaction(async (trx) => {
    const { count } = (await trx('cards').where({ current_phase_id: toPhaseId }).count<{ count: string }[]>('id as count').first()) ?? {
      count: '0',
    };
    await trx('cards')
      .where({ id: cardId })
      .update({
        current_phase_id: toPhaseId,
        position: Number(count),
        current_phase_since: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
    await CardHistoryModel.record(
      { card_id: cardId, user_id: userId, event_type: 'moved', from_phase_id: card.current_phase_id, to_phase_id: toPhaseId },
      trx
    );
  });
}

async function assignUserDirect(cardId: number, userId: number, actingUserId: number) {
  const user = await UserModel.findById(userId);
  if (!user || !user.active) {
    logger.warn({ cardId, userId }, 'Automação ignorada: usuário de destino inválido ou inativo');
    return;
  }
  await CardAssigneeModel.attach(cardId, userId);
  await CardHistoryModel.record({
    card_id: cardId,
    user_id: actingUserId,
    event_type: 'assigned',
    old_value: null,
    new_value: userId,
  });
  await NotificationService.notifyCardAssigned(cardId, userId, actingUserId).catch(() => undefined);
}

async function labelActionDirect(cardId: number, labelId: number, attach: boolean) {
  const [card, label] = await Promise.all([CardModel.findById(cardId), LabelModel.findById(labelId)]);
  if (!card || !label || label.pipeline_id !== card.pipeline_id) {
    logger.warn({ cardId, labelId }, 'Automação ignorada: etiqueta inválida para este pipeline');
    return;
  }
  if (attach) {
    await LabelModel.attachToCard(cardId, labelId);
  } else {
    await LabelModel.detachFromCard(cardId, labelId);
  }
}

async function runAction(
  automation: { action_type: string; action_config: Record<string, unknown> | null },
  cardId: number,
  actingUserId: number
) {
  const cfg = automation.action_config ?? {};
  switch (automation.action_type) {
    case 'move_to_phase':
      if (cfg.phase_id != null) await moveCardDirect(cardId, Number(cfg.phase_id), actingUserId);
      break;
    case 'assign_user':
      if (cfg.user_id != null) await assignUserDirect(cardId, Number(cfg.user_id), actingUserId);
      break;
    case 'add_label':
      if (cfg.label_id != null) await labelActionDirect(cardId, Number(cfg.label_id), true);
      break;
    case 'remove_label':
      if (cfg.label_id != null) await labelActionDirect(cardId, Number(cfg.label_id), false);
      break;
    default:
      break;
  }
}

export const AutomationService = {
  listByPipeline(pipelineId: number) {
    return AutomationModel.listByPipeline(pipelineId);
  },

  async create(
    pipelineId: number,
    input: {
      name: string;
      trigger_type: AutomationTriggerType;
      trigger_config?: Record<string, unknown> | null;
      action_type: string;
      action_config?: Record<string, unknown> | null;
      active?: boolean;
    }
  ) {
    const pipeline = await PipelineModel.findById(pipelineId);
    if (!pipeline) {
      throw AppError.notFound('Pipeline não encontrado');
    }
    return AutomationModel.create({
      pipeline_id: pipelineId,
      name: input.name,
      trigger_type: input.trigger_type,
      trigger_config: input.trigger_config ?? null,
      action_type: input.action_type as never,
      action_config: input.action_config ?? null,
      active: input.active ?? true,
    });
  },

  async update(
    automationId: number,
    changes: {
      name?: string;
      trigger_config?: Record<string, unknown> | null;
      action_type?: string;
      action_config?: Record<string, unknown> | null;
      active?: boolean;
    }
  ) {
    const automation = await AutomationModel.findById(automationId);
    if (!automation) {
      throw AppError.notFound('Automação não encontrada');
    }
    return AutomationModel.update(automationId, changes as never);
  },

  async delete(automationId: number) {
    const automation = await AutomationModel.findById(automationId);
    if (!automation) {
      throw AppError.notFound('Automação não encontrada');
    }
    return AutomationModel.delete(automationId);
  },

  /**
   * Dispara, de forma assíncrona e best-effort, as automações ativas do pipeline que
   * casam com o contexto informado. Sempre é chamado DEPOIS que a transação que
   * originou o evento (criar/mover card, atualizar campo) já foi commitada — assim
   * o registro já está visível e uma automação com erro nunca desfaz a ação do
   * usuário que a disparou. As ações rodam de forma direta (sem passar pelos
   * serviços públicos de card), então uma automação nunca dispara outra automação:
   * evita loop infinito por design, não é uma limitação temporária.
   */
  async runTriggers(pipelineId: number, context: TriggerContext, actingUserId: number) {
    const automations = await AutomationModel.listActiveByTrigger(pipelineId, context.type);
    for (const automation of automations) {
      if (!matchesTrigger(automation.trigger_config, context)) continue;
      try {
        await runAction(automation, context.cardId, actingUserId);
      } catch (err) {
        logger.error({ err, automationId: automation.id }, 'Falha ao executar automação');
      }
    }
  },
};

export type { TriggerContext };
