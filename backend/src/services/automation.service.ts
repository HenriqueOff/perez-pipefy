import axios from 'axios';
import http from 'http';
import https from 'https';
import { db } from '../config/db';
import { AutomationModel } from '../models/automation.model';
import { AutomationRecurrenceModel } from '../models/automationRecurrence.model';
import { CardModel } from '../models/card.model';
import { CardAssigneeModel } from '../models/cardAssignee.model';
import { CardConnectionModel } from '../models/cardConnection.model';
import { CardFieldValueModel } from '../models/cardFieldValue.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { CustomFieldModel } from '../models/customField.model';
import { EmailTemplateModel } from '../models/emailTemplate.model';
import { LabelModel } from '../models/label.model';
import { PhaseModel } from '../models/phase.model';
import { PipelineConnectionModel } from '../models/pipelineConnection.model';
import { PipelineModel } from '../models/pipeline.model';
import { UserModel } from '../models/user.model';
import { AutomationTriggerType } from '../types/enums';
import { AppError } from '../utils/AppError';
import { validateFieldValue } from '../utils/fieldValidation';
import { evaluateFormula, parseFormula } from '../utils/formulaEvaluator';
import { resolvePinnedAddress } from '../utils/ssrfGuard';
import { interpolateTemplate } from '../utils/templateInterpolation';
import { wrapBrandedEmail } from '../utils/emailLayout';
import { logger } from '../utils/logger';
import { FormulaFieldService } from './formulaField.service';
import { MailService } from './mail.service';
import { NotificationService } from './notification.service';

type TriggerContext =
  | { type: 'card_created_in_phase'; cardId: number; phaseId: number }
  | { type: 'card_moved_to_phase'; cardId: number; fromPhaseId: number; toPhaseId: number }
  | { type: 'card_left_phase'; cardId: number; fromPhaseId: number; toPhaseId: number }
  | { type: 'field_updated'; cardId: number; fieldId: number; value: unknown }
  | { type: 'sla_breached'; cardId: number; phaseId: number; slaHours: number };

function matchesTrigger(config: Record<string, unknown> | null, context: TriggerContext): boolean {
  const cfg = config ?? {};
  switch (context.type) {
    case 'card_created_in_phase':
      return cfg.phase_id == null || Number(cfg.phase_id) === context.phaseId;
    case 'card_moved_to_phase':
      return Number(cfg.phase_id) === context.toPhaseId;
    case 'card_left_phase':
      return Number(cfg.phase_id) === context.fromPhaseId;
    case 'field_updated':
      if (Number(cfg.field_id) !== context.fieldId) return false;
      if (cfg.value === undefined || cfg.value === null) return true;
      return JSON.stringify(cfg.value) === JSON.stringify(context.value);
    case 'sla_breached':
      return cfg.phase_id == null || Number(cfg.phase_id) === context.phaseId;
    default:
      return false;
  }
}

async function loadCardFieldsByKey(cardId: number, pipelineId: number, title: string): Promise<Record<string, unknown>> {
  const [fieldValues, customFields] = await Promise.all([
    CardFieldValueModel.listByCard(cardId),
    CustomFieldModel.listByPipeline(pipelineId),
  ]);
  const fieldById = new Map(customFields.map((f) => [f.id, f]));
  const valuesByKey: Record<string, unknown> = { title };
  for (const fv of fieldValues) {
    const field = fieldById.get(fv.custom_field_id);
    if (field) valuesByKey[field.key] = fv.value;
  }
  return valuesByKey;
}

async function moveCardDirect(cardId: number, toPhaseId: number, actingUserId: number | null) {
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
      { card_id: cardId, user_id: actingUserId, event_type: 'moved', from_phase_id: card.current_phase_id, to_phase_id: toPhaseId },
      trx
    );
  });
}

async function assignUserDirect(
  cardId: number,
  userId: number,
  actingUserId: number | null,
  task?: { dueDate?: string | null; note?: string | null }
) {
  const user = await UserModel.findById(userId);
  if (!user || !user.active) {
    logger.warn({ cardId, userId }, 'Automação ignorada: usuário de destino inválido ou inativo');
    return;
  }
  await CardAssigneeModel.attach(cardId, userId, { due_date: task?.dueDate ?? null, note: task?.note ?? null });
  await CardHistoryModel.record({
    card_id: cardId,
    user_id: actingUserId,
    event_type: 'assigned',
    old_value: null,
    new_value: userId,
  });
  await NotificationService.notifyCardAssigned(cardId, userId, actingUserId, task).catch(() => undefined);
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

async function updateFieldDirect(cardId: number, fieldId: number, value: unknown, actingUserId: number | null) {
  const card = await CardModel.findById(cardId);
  if (!card) return;

  const field = await CustomFieldModel.findById(fieldId);
  if (!field) {
    logger.warn({ cardId, fieldId }, 'Automação ignorada: campo inexistente');
    return;
  }
  const fieldPhase = await PhaseModel.findById(field.phase_id);
  if (!fieldPhase || fieldPhase.pipeline_id !== card.pipeline_id) {
    logger.warn({ cardId, fieldId }, 'Automação ignorada: campo não pertence ao pipeline deste card');
    return;
  }

  try {
    validateFieldValue(field, value);
  } catch (err) {
    logger.warn({ err, cardId, fieldId }, 'Automação ignorada: valor inválido para o campo');
    return;
  }

  const existing = await CardFieldValueModel.findOne(cardId, fieldId);
  await CardFieldValueModel.upsert(cardId, fieldId, value);
  await CardHistoryModel.record({
    card_id: cardId,
    user_id: actingUserId,
    event_type: 'field_updated',
    field_id: fieldId,
    old_value: existing?.value ?? null,
    new_value: value,
  });
  await FormulaFieldService.recomputeForCard(cardId, actingUserId).catch((err) =>
    logger.error({ err, cardId }, 'Falha ao recalcular campos de fórmula')
  );
}

async function createCardDirect(
  pipelineId: number,
  phaseId: number,
  title: string,
  actingUserId: number | null,
  fields?: Record<string, unknown>
) {
  const phase = await PhaseModel.findById(phaseId);
  if (!phase || phase.pipeline_id !== pipelineId) {
    logger.warn({ pipelineId, phaseId }, 'Automação ignorada: fase de destino inválida para este pipeline');
    return;
  }
  if (!title.trim()) {
    logger.warn({ pipelineId, phaseId }, 'Automação ignorada: título do card criado está vazio');
    return;
  }

  // cards.created_by exige um usuário válido (não existe usuário "sistema" no schema).
  // Quando não há um ator humano por trás (ex.: automação disparada por scan de SLA),
  // reaproveita o dono do pipeline como responsável pelo registro, mesma convenção já
  // usada pelo formulário público (publicForm.service.ts). O histórico do card continua
  // gravando actingUserId (possivelmente nulo) para mostrar "Automação" na timeline.
  let createdByFallback = actingUserId;
  if (createdByFallback == null) {
    const pipeline = await PipelineModel.findById(pipelineId);
    createdByFallback = pipeline?.created_by ?? null;
  }
  if (createdByFallback == null) {
    logger.warn({ pipelineId, phaseId }, 'Automação ignorada: não foi possível determinar um autor para o card criado');
    return;
  }

  const customFields = await CustomFieldModel.listByPhase(phaseId);
  const byKey = new Map(customFields.map((f) => [f.key, f]));

  const createdCardId = await db.transaction(async (trx) => {
    const { count } = (await trx('cards').where({ current_phase_id: phaseId }).count<{ count: string }[]>('id as count').first()) ?? {
      count: '0',
    };
    const [created] = await trx('cards')
      .insert({
        pipeline_id: pipelineId,
        current_phase_id: phaseId,
        title,
        created_by: createdByFallback,
        position: Number(count),
      })
      .returning('*');

    await CardHistoryModel.record(
      { card_id: created.id, user_id: actingUserId, event_type: 'created', to_phase_id: phaseId },
      trx
    );

    for (const [key, value] of Object.entries(fields ?? {})) {
      const field = byKey.get(key);
      if (!field) {
        logger.warn({ key }, 'Automação ignorada: campo não existe nesta fase, valor descartado');
        continue;
      }
      try {
        validateFieldValue(field, value);
      } catch (err) {
        logger.warn({ err, key }, 'Automação ignorada: valor inválido para o campo, valor descartado');
        continue;
      }
      await CardFieldValueModel.upsert(created.id, field.id, value, trx);
    }

    return created.id as number;
  });

  await FormulaFieldService.recomputeForCard(createdCardId, actingUserId).catch((err) =>
    logger.error({ err, cardId: createdCardId }, 'Falha ao recalcular campos de fórmula')
  );

  return createdCardId;
}

async function distributeAssigneesDirect(
  cardId: number,
  candidateUserIds: number[],
  automationId: number,
  actingUserId: number | null,
  task?: { dueDate?: string | null; note?: string | null }
) {
  if (candidateUserIds.length === 0) {
    logger.warn({ automationId }, 'Automação ignorada: nenhum candidato configurado para distribuir responsáveis');
    return;
  }

  const [row] = await db('automations')
    .where({ id: automationId })
    .update({
      action_config: db.raw(
        `jsonb_set(coalesce(action_config, '{}'::jsonb), '{cursor}', to_jsonb(((coalesce((action_config->>'cursor')::int, -1) + 1) % ?)::int), true)`,
        [candidateUserIds.length]
      ),
    })
    .returning('action_config');

  const cursor = Number((row?.action_config as Record<string, unknown> | undefined)?.cursor ?? 0);
  const candidateId = candidateUserIds[cursor % candidateUserIds.length];
  await assignUserDirect(cardId, candidateId, actingUserId, task);
}

async function sendEmailTemplateDirect(
  cardId: number,
  templateId: number,
  recipientConfig: { recipient_type?: string; field_id?: number; email?: string }
) {
  const card = await CardModel.findById(cardId);
  if (!card) return;

  const template = await EmailTemplateModel.findById(templateId);
  if (!template || template.pipeline_id !== card.pipeline_id) {
    logger.warn({ cardId, templateId }, 'Automação ignorada: modelo de e-mail inválido para este pipeline');
    return;
  }

  const valuesByKey = await loadCardFieldsByKey(cardId, card.pipeline_id, card.title);

  const subject = interpolateTemplate(template.subject, { title: card.title, fields: valuesByKey });
  const html = wrapBrandedEmail(interpolateTemplate(template.body_html, { title: card.title, fields: valuesByKey }));

  const recipients: string[] = [];
  switch (recipientConfig.recipient_type) {
    case 'custom_field': {
      const recipientField = recipientConfig.field_id != null ? await CustomFieldModel.findById(recipientConfig.field_id) : null;
      const value = recipientField ? valuesByKey[recipientField.key] : null;
      if (typeof value === 'string' && value.trim()) recipients.push(value.trim());
      break;
    }
    case 'static':
      if (recipientConfig.email) recipients.push(recipientConfig.email);
      break;
    case 'assignees':
    default: {
      const assignees = await CardAssigneeModel.listByCard(cardId);
      const users = await Promise.all(assignees.map((a) => UserModel.findById(a.user_id)));
      for (const user of users) {
        if (user?.email) recipients.push(user.email);
      }
      break;
    }
  }

  if (recipients.length === 0) {
    logger.warn({ cardId, templateId }, 'Automação ignorada: nenhum destinatário resolvido para o e-mail');
    return;
  }

  for (const to of recipients) {
    try {
      await MailService.sendEmail({ to, subject, html });
    } catch (err) {
      logger.error({ err, cardId, templateId, to }, 'Falha ao enviar e-mail de automação');
    }
  }
}

async function applySlaRuleDirect(cardId: number, slaHours: number) {
  if (!Number.isFinite(slaHours) || slaHours <= 0) {
    logger.warn({ cardId, slaHours }, 'Automação ignorada: horas de SLA inválidas');
    return;
  }
  const card = await CardModel.findById(cardId);
  if (!card) return;
  await CardModel.update(cardId, { sla_override_hours: Math.round(slaHours) });
}

async function applyFormulaDirect(cardId: number, targetFieldId: number, formula: string, actingUserId: number | null) {
  const card = await CardModel.findById(cardId);
  if (!card) return;

  const targetField = await CustomFieldModel.findById(targetFieldId);
  if (!targetField) {
    logger.warn({ cardId, targetFieldId }, 'Automação ignorada: campo-alvo inexistente');
    return;
  }
  if (targetField.type === 'formula') {
    logger.warn(
      { cardId, targetFieldId },
      'Automação ignorada: campo-alvo é do tipo fórmula (só o motor de recálculo pode escrevê-lo)'
    );
    return;
  }
  const targetPhase = await PhaseModel.findById(targetField.phase_id);
  if (!targetPhase || targetPhase.pipeline_id !== card.pipeline_id) {
    logger.warn({ cardId, targetFieldId }, 'Automação ignorada: campo-alvo não pertence ao pipeline deste card');
    return;
  }

  let node;
  try {
    node = parseFormula(formula);
  } catch (err) {
    logger.warn({ err, cardId, targetFieldId }, 'Automação ignorada: fórmula com erro de sintaxe');
    return;
  }

  const valuesByKey = await loadCardFieldsByKey(cardId, card.pipeline_id, card.title);

  let result: number;
  try {
    result = evaluateFormula(node, valuesByKey);
  } catch (err) {
    logger.warn({ err, cardId, targetFieldId }, 'Automação ignorada: falha ao calcular a fórmula');
    return;
  }

  await updateFieldDirect(cardId, targetFieldId, result, actingUserId);
}

async function httpRequestDirect(
  cardId: number,
  config: { method?: string; url?: string; headers?: Record<string, string>; body?: string; response_field_id?: number },
  actingUserId: number | null
) {
  const card = await CardModel.findById(cardId);
  if (!card) return;
  if (!config.url) {
    logger.warn({ cardId }, 'Automação ignorada: URL da requisição HTTP não informada');
    return;
  }

  const valuesByKey = await loadCardFieldsByKey(cardId, card.pipeline_id, card.title);
  const method = (config.method ?? 'GET').toUpperCase();
  const url = interpolateTemplate(config.url, { title: card.title, fields: valuesByKey });
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.headers ?? {})) {
    headers[key] = interpolateTemplate(value, { title: card.title, fields: valuesByKey });
  }
  const body =
    method !== 'GET' && config.body ? interpolateTemplate(config.body, { title: card.title, fields: valuesByKey }) : undefined;

  let pinned;
  try {
    ({ pinned } = await resolvePinnedAddress(url));
  } catch (err) {
    logger.warn({ err, cardId, url }, 'Automação ignorada: URL de requisição HTTP bloqueada');
    return;
  }

  // Fixa a conexão TCP no endereço já validado por resolvePinnedAddress: sem isso, o
  // Axios resolveria o DNS de novo na hora de conectar, e um DNS malicioso poderia
  // responder um IP público na checagem e um IP interno na conexão real (rebinding).
  const lookup = (_hostname: string, _options: unknown, callback: (err: null, address: string, family: number) => void) =>
    callback(null, pinned.address, pinned.family);
  const agentOptions = { lookup: lookup as never };
  const agent = new URL(url).protocol === 'https:' ? new https.Agent(agentOptions) : new http.Agent(agentOptions);

  let response;
  try {
    response = await axios({
      method,
      url,
      headers,
      data: body,
      timeout: 10_000,
      validateStatus: () => true,
      httpAgent: agent,
      httpsAgent: agent,
    });
  } catch (err) {
    logger.warn({ err, cardId, url }, 'Automação ignorada: falha na requisição HTTP');
    return;
  }

  if (config.response_field_id != null) {
    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const truncated = raw.length > 5000 ? `${raw.slice(0, 5000)}…` : raw;
    await updateFieldDirect(cardId, config.response_field_id, truncated, actingUserId);
  }
}

/**
 * Resolve o "outro lado" de uma conexão configurada a partir do card disparador. `fromSide`
 * indica em qual lado (owner/target) da conexão o card disparador deveria estar; se a
 * pipeline dele não bater, a conexão não se aplica a esse card (config errada na automação).
 */
async function resolveConnectionSide(pipelineConnectionId: number, fromSide: string, triggerCardId: number) {
  const connection = await PipelineConnectionModel.findById(pipelineConnectionId);
  if (!connection) return null;
  const card = await CardModel.findById(triggerCardId);
  if (!card) return null;

  const expectedPipelineId = fromSide === 'owner' ? connection.owner_pipeline_id : connection.target_pipeline_id;
  if (card.pipeline_id !== expectedPipelineId) return null;

  const otherPipelineId = fromSide === 'owner' ? connection.target_pipeline_id : connection.owner_pipeline_id;
  return { connection, otherPipelineId };
}

async function createConnectedCardDirect(
  cardId: number,
  config: {
    pipeline_connection_id: number;
    from_side: string;
    phase_id: number;
    title: string;
    fields?: Record<string, unknown>;
  },
  actingUserId: number | null
) {
  const resolved = await resolveConnectionSide(config.pipeline_connection_id, config.from_side, cardId);
  if (!resolved) {
    logger.warn({ cardId, config }, 'Automação ignorada: conexão inválida para este card');
    return;
  }
  const targetPhase = await PhaseModel.findById(config.phase_id);
  if (!targetPhase || targetPhase.pipeline_id !== resolved.otherPipelineId) {
    logger.warn({ cardId, config }, 'Automação ignorada: fase de destino não pertence à pipeline do outro lado da conexão');
    return;
  }

  const newCardId = await createCardDirect(resolved.otherPipelineId, config.phase_id, config.title, actingUserId, config.fields);
  if (newCardId == null) return;

  const ownerCardId = config.from_side === 'owner' ? cardId : newCardId;
  const targetCardId = config.from_side === 'owner' ? newCardId : cardId;
  await CardConnectionModel.create({
    pipeline_connection_id: resolved.connection.id,
    owner_card_id: ownerCardId,
    target_card_id: targetCardId,
  });
}

async function moveConnectedCardsDirect(
  cardId: number,
  config: { pipeline_connection_id: number; from_side: string; phase_id: number },
  actingUserId: number | null
) {
  const resolved = await resolveConnectionSide(config.pipeline_connection_id, config.from_side, cardId);
  if (!resolved) {
    logger.warn({ cardId, config }, 'Automação ignorada: conexão inválida para este card');
    return;
  }
  const targetPhase = await PhaseModel.findById(config.phase_id);
  if (!targetPhase || targetPhase.pipeline_id !== resolved.otherPipelineId) {
    logger.warn({ cardId, config }, 'Automação ignorada: fase de destino não pertence à pipeline do outro lado da conexão');
    return;
  }

  const connectedCards =
    config.from_side === 'owner'
      ? await CardConnectionModel.listTargetsForOwner(config.pipeline_connection_id, cardId)
      : await CardConnectionModel.listOwnersForTarget(config.pipeline_connection_id, cardId);

  for (const connected of connectedCards) {
    await moveCardDirect(connected.card_id, config.phase_id, actingUserId);
  }
}

async function runAction(
  automation: { id: number; action_type: string; action_config: Record<string, unknown> | null },
  cardId: number,
  actingUserId: number | null
) {
  const cfg = automation.action_config ?? {};
  switch (automation.action_type) {
    case 'move_to_phase':
      if (cfg.phase_id != null) await moveCardDirect(cardId, Number(cfg.phase_id), actingUserId);
      break;
    case 'assign_user':
      if (cfg.user_id != null) {
        await assignUserDirect(cardId, Number(cfg.user_id), actingUserId, {
          dueDate: (cfg.due_date as string | undefined) ?? null,
          note: (cfg.note as string | undefined) ?? null,
        });
      }
      break;
    case 'add_label':
      if (cfg.label_id != null) await labelActionDirect(cardId, Number(cfg.label_id), true);
      break;
    case 'remove_label':
      if (cfg.label_id != null) await labelActionDirect(cardId, Number(cfg.label_id), false);
      break;
    case 'update_field':
      if (cfg.field_id != null) await updateFieldDirect(cardId, Number(cfg.field_id), cfg.value, actingUserId);
      break;
    case 'create_card': {
      const card = await CardModel.findById(cardId);
      if (card && cfg.phase_id != null && typeof cfg.title === 'string') {
        await createCardDirect(
          card.pipeline_id,
          Number(cfg.phase_id),
          cfg.title,
          actingUserId,
          (cfg.fields as Record<string, unknown> | undefined) ?? undefined
        );
      }
      break;
    }
    case 'distribute_assignees': {
      const candidates = Array.isArray(cfg.user_ids) ? (cfg.user_ids as unknown[]).map(Number) : [];
      await distributeAssigneesDirect(cardId, candidates, automation.id, actingUserId, {
        dueDate: (cfg.due_date as string | undefined) ?? null,
        note: (cfg.note as string | undefined) ?? null,
      });
      break;
    }
    case 'send_email_template':
      if (cfg.template_id != null) {
        await sendEmailTemplateDirect(
          cardId,
          Number(cfg.template_id),
          cfg as { recipient_type?: string; field_id?: number; email?: string }
        );
      }
      break;
    case 'apply_sla_rule':
      if (cfg.sla_hours != null) await applySlaRuleDirect(cardId, Number(cfg.sla_hours));
      break;
    case 'apply_formula':
      if (cfg.target_field_id != null && typeof cfg.formula === 'string') {
        await applyFormulaDirect(cardId, Number(cfg.target_field_id), cfg.formula, actingUserId);
      }
      break;
    case 'http_request':
      await httpRequestDirect(
        cardId,
        cfg as { method?: string; url?: string; headers?: Record<string, string>; body?: string; response_field_id?: number },
        actingUserId
      );
      break;
    case 'create_connected_card':
      if (cfg.pipeline_connection_id != null && cfg.from_side != null && cfg.phase_id != null && typeof cfg.title === 'string') {
        await createConnectedCardDirect(
          cardId,
          {
            pipeline_connection_id: Number(cfg.pipeline_connection_id),
            from_side: String(cfg.from_side),
            phase_id: Number(cfg.phase_id),
            title: cfg.title,
            fields: (cfg.fields as Record<string, unknown> | undefined) ?? undefined,
          },
          actingUserId
        );
      }
      break;
    case 'move_connected_cards':
      if (cfg.pipeline_connection_id != null && cfg.from_side != null && cfg.phase_id != null) {
        await moveConnectedCardsDirect(
          cardId,
          {
            pipeline_connection_id: Number(cfg.pipeline_connection_id),
            from_side: String(cfg.from_side),
            phase_id: Number(cfg.phase_id),
          },
          actingUserId
        );
      }
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
    pipelineId: number,
    changes: {
      name?: string;
      trigger_config?: Record<string, unknown> | null;
      action_type?: string;
      action_config?: Record<string, unknown> | null;
      active?: boolean;
    }
  ) {
    const automation = await AutomationModel.findById(automationId);
    if (!automation || automation.pipeline_id !== pipelineId) {
      throw AppError.notFound('Automação não encontrada');
    }
    return AutomationModel.update(automationId, changes as never);
  },

  async delete(automationId: number, pipelineId: number) {
    const automation = await AutomationModel.findById(automationId);
    if (!automation || automation.pipeline_id !== pipelineId) {
      throw AppError.notFound('Automação não encontrada');
    }
    return AutomationModel.delete(automationId);
  },

  /**
   * Dispara, de forma assíncrona e best-effort, as automações ativas do pipeline que
   * casam com o contexto informado. Sempre é chamado DEPOIS que a transação que
   * originou o evento (criar/mover card, atualizar campo, scan de SLA) já foi
   * commitada — assim o registro já está visível e uma automação com erro nunca desfaz
   * a ação que a disparou. As ações rodam de forma direta (sem passar pelos serviços
   * públicos de card), então uma automação nunca dispara outra automação: evita loop
   * infinito por design, não é uma limitação temporária.
   *
   * `actingUserId` é `null` quando o disparo vem de um processo em segundo plano sem
   * usuário humano por trás (ex.: scan de SLA) — nesse caso o histórico do card grava
   * o evento com autor "sistema" (user_id nulo).
   */
  async runTriggers(pipelineId: number, context: TriggerContext, actingUserId: number | null) {
    let automations;
    try {
      automations = await AutomationModel.listActiveByTrigger(pipelineId, context.type);
    } catch (err) {
      logger.error({ err, pipelineId, triggerType: context.type }, 'Falha ao buscar automações do pipeline');
      return;
    }
    for (const automation of automations) {
      if (!matchesTrigger(automation.trigger_config, context)) continue;
      try {
        await runAction(automation, context.cardId, actingUserId);
      } catch (err) {
        logger.error({ err, automationId: automation.id }, 'Falha ao executar automação');
      }
    }
  },

  /**
   * Scan periódico (chamado a cada 15 min por server.ts, junto com o scan de SLA) que
   * dispara automações do tipo "atividade recorrente". Diferente de runTriggers, não
   * nasce de um evento pontual de card — cada automação define seu próprio intervalo
   * (trigger_config.interval_hours) e uma fase opcional. Sem ator humano por trás
   * (actingUserId sempre null, mesma convenção do scan de SLA).
   */
  async scanRecurringAutomations() {
    let automations;
    try {
      automations = await AutomationModel.listActiveRecurring();
    } catch (err) {
      logger.error({ err }, 'Falha ao buscar automações recorrentes');
      return;
    }

    const now = Date.now();

    for (const automation of automations) {
      const cfg = automation.trigger_config ?? {};
      const intervalHours = Number(cfg.interval_hours);
      if (!Number.isFinite(intervalHours) || intervalHours <= 0) continue;
      const phaseId = cfg.phase_id != null ? Number(cfg.phase_id) : null;

      try {
        const cards = phaseId != null
          ? await CardModel.listByPipeline(automation.pipeline_id).then((rows) => rows.filter((c) => c.current_phase_id === phaseId))
          : await CardModel.listByPipeline(automation.pipeline_id);

        for (const card of cards) {
          const recurrence = await AutomationRecurrenceModel.findOne(automation.id, card.id);
          const phaseAnchor = phaseId != null ? card.current_phase_since : card.created_at;
          const anchor = recurrence && recurrence.last_fired_at > phaseAnchor ? recurrence.last_fired_at : phaseAnchor;
          const elapsedHours = (now - new Date(anchor).getTime()) / 3600000;
          if (elapsedHours < intervalHours) continue;

          try {
            await runAction(automation, card.id, null);
          } catch (err) {
            logger.error({ err, automationId: automation.id, cardId: card.id }, 'Falha ao executar automação recorrente');
          }
          await AutomationRecurrenceModel.markFired(automation.id, card.id, new Date(now));
        }
      } catch (err) {
        logger.error({ err, automationId: automation.id }, 'Falha ao processar automação recorrente');
      }
    }
  },

  /**
   * Chamado depois que um card se move (CardService.move), quando esse card é owner de
   * alguma conexão. Pra cada card target distinto conectado a ele, verifica as automações
   * ativas do tipo 'all_connected_cards_in_phase' na pipeline do target — dispara só se
   * TODOS os owners conectados a esse target (sob a mesma conexão) estiverem na fase
   * configurada. Checagem localizada (só os cards conectados a esse card), não uma
   * varredura geral.
   */
  async checkAllConnectedCardsInPhase(ownerCardId: number, actingUserId: number | null) {
    let connections;
    try {
      connections = await CardConnectionModel.listByOwnerCard(ownerCardId);
    } catch (err) {
      logger.error({ err, ownerCardId }, 'Falha ao buscar conexões do card');
      return;
    }
    if (connections.length === 0) return;

    const targets = new Map<string, { pipelineConnectionId: number; targetCardId: number }>();
    for (const c of connections) {
      targets.set(`${c.pipeline_connection_id}:${c.target_card_id}`, {
        pipelineConnectionId: c.pipeline_connection_id,
        targetCardId: c.target_card_id,
      });
    }

    for (const { pipelineConnectionId, targetCardId } of targets.values()) {
      const targetCard = await CardModel.findById(targetCardId);
      if (!targetCard) continue;

      let automations;
      try {
        automations = await AutomationModel.listActiveByTrigger(targetCard.pipeline_id, 'all_connected_cards_in_phase');
      } catch (err) {
        logger.error({ err, targetCardId }, 'Falha ao buscar automações de cards conectados');
        continue;
      }

      for (const automation of automations) {
        const cfg = automation.trigger_config ?? {};
        if (cfg.pipeline_connection_id == null || Number(cfg.pipeline_connection_id) !== pipelineConnectionId) continue;
        const phaseId = cfg.phase_id != null ? Number(cfg.phase_id) : NaN;
        if (!Number.isFinite(phaseId)) continue;

        const owners = await CardConnectionModel.listOwnersForTarget(pipelineConnectionId, targetCardId);
        if (owners.length === 0) continue;
        const allInPhase = owners.every((o) => o.current_phase_id === phaseId);
        if (!allInPhase) continue;

        try {
          await runAction(automation, targetCardId, actingUserId);
        } catch (err) {
          logger.error({ err, automationId: automation.id }, 'Falha ao executar automação de cards conectados');
        }
      }
    }
  },
};

export type { TriggerContext };
