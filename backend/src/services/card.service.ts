import { Knex } from 'knex';
import { db } from '../config/db';
import { AttachmentModel } from '../models/attachment.model';
import { CardModel } from '../models/card.model';
import { CardFieldValueModel } from '../models/cardFieldValue.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { CardAssigneeModel } from '../models/cardAssignee.model';
import { ChecklistItemModel } from '../models/checklistItem.model';
import { CustomFieldModel } from '../models/customField.model';
import { DatabaseFieldModel } from '../models/databaseField.model';
import { DatabaseRecordModel } from '../models/databaseRecord.model';
import { DatabaseRecordFieldValueModel } from '../models/databaseRecordFieldValue.model';
import { LabelModel } from '../models/label.model';
import { PhaseModel } from '../models/phase.model';
import { AutomationService } from './automation.service';
import { FormulaFieldService } from './formulaField.service';
import { NotificationService } from './notification.service';
import { CustomFieldRow } from '../types/entities';
import { PipelineRole } from '../types/enums';
import { AppError } from '../utils/AppError';
import { resolveDatabaseActorRole } from '../utils/databaseRole';
import { requiredFieldsMissing, validateFieldValue } from '../utils/fieldValidation';
import { logger } from '../utils/logger';
import { resolveActorRole, roleAtLeast } from '../utils/pipelineRole';
import { assertCardInPipeline } from '../utils/assertOwnership';
import { sanitizeText } from '../utils/sanitizeText';
import { TriggerContext } from './automation.service';

// Recalcular fórmulas nunca deve derrubar a operação que motivou a mudança de campo.
async function recomputeFormulasSafely(cardId: number, actingUserId: number) {
  await FormulaFieldService.recomputeForCard(cardId, actingUserId).catch((err) =>
    logger.error({ err, cardId }, 'Falha ao recalcular campos de fórmula')
  );
}

// Uma falha ao buscar/rodar automações nunca deve virar erro na requisição que já
// commitou a ação do usuário (card criado/movido/atualizado) — só loga.
async function runTriggersSafely(pipelineId: number, context: TriggerContext, actingUserId: number) {
  await AutomationService.runTriggers(pipelineId, context, actingUserId).catch((err) =>
    logger.error({ err, pipelineId, triggerType: context.type }, 'Falha ao disparar automações')
  );
}

// Pro frontend não precisar de acesso ao database só pra mostrar um nome em vez de um id
// cru: anexa o título do registro vinculado a cada valor de campo database_link. Value em
// si continua sendo só o id (é o que a UI reenvia ao salvar).
async function enrichDatabaseLinkValues<T extends { custom_field_id: number; value: unknown }>(
  fieldValues: T[],
  allFields: CustomFieldRow[]
): Promise<(T & { linkedRecordTitle?: string | null })[]> {
  const fieldById = new Map(allFields.map((f) => [f.id, f]));
  return Promise.all(
    fieldValues.map(async (fv) => {
      const field = fieldById.get(fv.custom_field_id);
      if (field?.type !== 'database_link' || fv.value === null || fv.value === undefined) {
        return fv;
      }
      const record = await DatabaseRecordModel.findById(Number(fv.value));
      return { ...fv, linkedRecordTitle: record?.title ?? null };
    })
  );
}

async function getFirstPhase(pipelineId: number) {
  const phases = await PhaseModel.listByPipeline(pipelineId);
  if (phases.length === 0) {
    throw new AppError('Este pipeline ainda não possui fases configuradas', 422);
  }
  return phases.find((p) => p.is_initial) ?? phases[0];
}

// Campo 'database_link' não tem validação de formato/opções como os outros tipos — o que
// importa é que o valor seja o id de um registro que exista de fato no database vinculado
// ao campo, e que quem está editando tenha pelo menos 'viewer' nesse database (a permissão
// do pipe não dá acesso automático a um database de outro dono).
async function validateDatabaseLinkValue(field: CustomFieldRow, value: unknown, userId: number): Promise<void> {
  if (value === null || value === undefined || value === '') {
    if (field.required) {
      throw new AppError(`O campo "${field.label}" é obrigatório`, 422);
    }
    return;
  }
  const recordId = Number(value);
  if (!Number.isInteger(recordId) || recordId <= 0 || !field.linked_database_id) {
    throw new AppError(`O campo "${field.label}" precisa de um registro válido`, 422);
  }
  const record = await DatabaseRecordModel.findById(recordId);
  if (!record || record.database_id !== field.linked_database_id) {
    throw new AppError(`Registro não encontrado no database vinculado ao campo "${field.label}"`, 422);
  }
  const actorDbRole = await resolveDatabaseActorRole(field.linked_database_id, userId);
  if (!roleAtLeast(actorDbRole, 'viewer')) {
    throw AppError.forbidden(`Você não tem acesso ao database vinculado ao campo "${field.label}"`);
  }
}

// 'photo_gallery' guarda um array de ids de attachments (o mesmo mecanismo de anexo já
// usado pelo card) — o que precisa validar é que cada id realmente pertence a ESTE card,
// senão um usuário poderia referenciar (e assim expor) o anexo de um card de outro pipeline.
async function validatePhotoGalleryValue(field: CustomFieldRow, value: unknown, cardId: number): Promise<void> {
  if (value === null || value === undefined) {
    if (field.required) {
      throw new AppError(`O campo "${field.label}" é obrigatório`, 422);
    }
    return;
  }
  if (!Array.isArray(value) || value.some((v) => !Number.isInteger(v))) {
    throw new AppError(`O campo "${field.label}" deve ser uma lista de anexos`, 422);
  }
  if (field.required && value.length === 0) {
    throw new AppError(`O campo "${field.label}" é obrigatório`, 422);
  }
  if (value.length === 0) return;

  const attachments = await AttachmentModel.listByCard(cardId);
  const validIds = new Set(attachments.map((a) => a.id));
  if (!value.every((id) => validIds.has(id))) {
    throw new AppError(`O campo "${field.label}" referencia um anexo que não pertence a este card`, 422);
  }
}

// "Puxar dado do Database pra dentro do pipe": ao escolher um registro num campo
// database_link, qualquer OUTRO campo customizado da mesma fase cuja key bata com a key de
// um campo do database vinculado é preenchido automaticamente com o valor daquele registro.
// Convenção por key (não por um mapeamento explícito) — igual a como os outros dois pontos
// desse app que reaproveitam texto por key já funcionam (formulário público, import).
async function autofillFromDatabaseLink(
  cardId: number,
  linkField: CustomFieldRow,
  recordId: number,
  siblingFields: CustomFieldRow[],
  userId: number,
  trx: Knex.Transaction
): Promise<{ fieldId: number; value: unknown }[]> {
  const dbFields = await DatabaseFieldModel.listByDatabase(linkField.linked_database_id!);
  const dbFieldByKey = new Map(dbFields.map((f) => [f.key, f]));
  const recordValues = await DatabaseRecordFieldValueModel.listByRecord(recordId);
  const valueByDbFieldId = new Map(recordValues.map((v) => [v.database_field_id, v.value]));

  const applied: { fieldId: number; value: unknown }[] = [];
  for (const sibling of siblingFields) {
    if (sibling.id === linkField.id || sibling.type === 'database_link' || sibling.type === 'formula') continue;
    const dbField = dbFieldByKey.get(sibling.key);
    if (!dbField || !valueByDbFieldId.has(dbField.id)) continue;

    const value = valueByDbFieldId.get(dbField.id);
    const existing = await CardFieldValueModel.findOne(cardId, sibling.id, trx);
    await CardFieldValueModel.upsert(cardId, sibling.id, value, trx);
    await CardHistoryModel.record(
      {
        card_id: cardId,
        user_id: userId,
        event_type: 'field_updated',
        field_id: sibling.id,
        old_value: existing?.value ?? null,
        new_value: value,
      },
      trx
    );
    applied.push({ fieldId: sibling.id, value });
  }
  return applied;
}

async function applyFieldValues(
  cardId: number,
  phaseId: number,
  fields: Record<string, unknown>,
  userId: number,
  trx: Knex.Transaction,
  actorRole: PipelineRole
): Promise<{ fieldId: number; value: unknown }[]> {
  const customFields = await CustomFieldModel.listByPhase(phaseId);
  const byKey = new Map(customFields.map((f) => [f.key, f]));
  const applied: { fieldId: number; value: unknown }[] = [];

  for (const [key, value] of Object.entries(fields)) {
    const field = byKey.get(key);
    if (!field) {
      throw new AppError(`Campo customizado "${key}" não existe nesta fase`, 422);
    }
    if (!roleAtLeast(actorRole, field.min_edit_role ?? 'editor')) {
      throw AppError.forbidden(`Você não tem permissão para editar o campo "${field.label}"`);
    }

    if (field.type === 'database_link') {
      await validateDatabaseLinkValue(field, value, userId);
    } else if (field.type === 'photo_gallery') {
      await validatePhotoGalleryValue(field, value, cardId);
    } else {
      validateFieldValue(field, value);
    }

    const existing = await CardFieldValueModel.findOne(cardId, field.id, trx);
    await CardFieldValueModel.upsert(cardId, field.id, value, trx);

    await CardHistoryModel.record(
      {
        card_id: cardId,
        user_id: userId,
        event_type: 'field_updated',
        field_id: field.id,
        old_value: existing?.value ?? null,
        new_value: value,
      },
      trx
    );

    applied.push({ fieldId: field.id, value });

    if (field.type === 'database_link' && value !== null && value !== undefined && value !== '') {
      const autofilled = await autofillFromDatabaseLink(cardId, field, Number(value), customFields, userId, trx);
      applied.push(...autofilled);
    }
  }

  return applied;
}

async function runFieldAutomations(pipelineId: number, cardId: number, userId: number, pairs: { fieldId: number; value: unknown }[]) {
  for (const pair of pairs) {
    await runTriggersSafely(pipelineId, { type: 'field_updated', cardId, fieldId: pair.fieldId, value: pair.value }, userId);
  }
}

export const CardService = {
  async listByPipeline(pipelineId: number, userId: number) {
    const [cards, labelRows, assigneeRows, checklistRows, actorRole, allFields, fieldValueRows] = await Promise.all([
      CardModel.listByPipeline(pipelineId),
      LabelModel.listByPipelineCards(pipelineId),
      CardAssigneeModel.listByPipelineCards(pipelineId),
      ChecklistItemModel.countsByPipelineCards(pipelineId),
      resolveActorRole(pipelineId, userId),
      CustomFieldModel.listByPipeline(pipelineId),
      CardFieldValueModel.listByPipelineCards(pipelineId),
    ]);
    const visibleFieldIds = new Set(
      allFields.filter((f) => roleAtLeast(actorRole, f.min_view_role ?? 'viewer')).map((f) => f.id)
    );
    const checklistByCard = new Map<number, { total: number; done: number }>();
    for (const row of checklistRows) {
      checklistByCard.set(row.card_id, { total: Number(row.total), done: Number(row.done) });
    }
    const labelsByCard = new Map<number, { id: number; name: string; color: string }[]>();
    for (const row of labelRows) {
      const list = labelsByCard.get(row.card_id) ?? [];
      list.push({ id: row.id, name: row.name, color: row.color });
      labelsByCard.set(row.card_id, list);
    }
    const assigneesByCard = new Map<number, { user_id: number; name: string }[]>();
    for (const row of assigneeRows) {
      const list = assigneesByCard.get(row.card_id) ?? [];
      list.push({ user_id: row.user_id, name: row.name });
      assigneesByCard.set(row.card_id, list);
    }
    const fieldValuesByCard = new Map<number, typeof fieldValueRows>();
    for (const value of fieldValueRows) {
      if (!visibleFieldIds.has(value.custom_field_id)) continue;
      const list = fieldValuesByCard.get(value.card_id) ?? [];
      list.push(value);
      fieldValuesByCard.set(value.card_id, list);
    }
    return cards.map((card) => ({
      ...card,
      fieldValues: fieldValuesByCard.get(card.id) ?? [],
      labels: labelsByCard.get(card.id) ?? [],
      assignees: assigneesByCard.get(card.id) ?? [],
      checklistSummary: checklistByCard.get(card.id) ?? { total: 0, done: 0 },
    }));
  },

  async getDetail(cardId: number, pipelineId: number, userId: number) {
    const card = await assertCardInPipeline(cardId, pipelineId);
    const [fieldValues, history, labels, assignees, checklist, actorRole, allFields] = await Promise.all([
      CardFieldValueModel.listByCard(card.id),
      CardHistoryModel.listByCard(card.id),
      LabelModel.listByCard(card.id),
      CardAssigneeModel.listByCard(card.id),
      ChecklistItemModel.listByCard(card.id),
      resolveActorRole(card.pipeline_id, userId),
      CustomFieldModel.listByPipeline(card.pipeline_id),
    ]);
    const visibleFieldIds = new Set(
      allFields.filter((f) => roleAtLeast(actorRole, f.min_view_role ?? 'viewer')).map((f) => f.id)
    );
    // uma entrada de histórico de field_updated carrega old_value/new_value diretamente —
    // se não filtrar aqui também, o valor de um campo restrito vaza pela timeline.
    const visibleFieldValues = await enrichDatabaseLinkValues(
      fieldValues.filter((v) => visibleFieldIds.has(v.custom_field_id)),
      allFields
    );
    const visibleHistory = history.filter((h) => h.field_id == null || visibleFieldIds.has(h.field_id));
    const checklistSummary = { total: checklist.length, done: checklist.filter((i) => i.done).length };
    return { ...card, fieldValues: visibleFieldValues, history: visibleHistory, labels, assignees, checklistSummary };
  },

  async create(
    pipelineId: number,
    userId: number,
    input: {
      title: string;
      phase_id?: number;
      assignee_ids?: number[];
      due_date?: string | null;
      fields?: Record<string, unknown>;
    },
    options: { enforceManualCreationFlag?: boolean } = {}
  ) {
    const { enforceManualCreationFlag = true } = options;
    const title = await sanitizeText(input.title);
    if (!title) {
      throw new AppError('Título do card não pode ficar vazio', 422);
    }
    const phase = input.phase_id ? await PhaseModel.findById(input.phase_id) : await getFirstPhase(pipelineId);
    if (!phase || phase.pipeline_id !== pipelineId) {
      throw new AppError('Fase inválida para este pipeline', 422);
    }
    if (enforceManualCreationFlag && !phase.allow_manual_card_creation) {
      throw AppError.forbidden('Criação manual de card desativada nesta fase');
    }
    const actorRole = await resolveActorRole(pipelineId, userId);

    const { card, fieldPairs } = await db.transaction(async (trx) => {
      const { count } = (await trx('cards').where({ current_phase_id: phase.id }).count<{ count: string }[]>('id as count').first()) ?? {
        count: '0',
      };

      const [created] = await trx('cards')
        .insert({
          pipeline_id: pipelineId,
          current_phase_id: phase.id,
          title,
          created_by: userId,
          due_date: input.due_date ?? null,
          position: Number(count),
        })
        .returning('*');

      await CardHistoryModel.record(
        { card_id: created.id, user_id: userId, event_type: 'created', to_phase_id: phase.id },
        trx
      );

      for (const assigneeId of input.assignee_ids ?? []) {
        await trx('card_assignees').insert({ card_id: created.id, user_id: assigneeId });
      }

      let fieldPairs: { fieldId: number; value: unknown }[] = [];
      if (input.fields && Object.keys(input.fields).length > 0) {
        fieldPairs = await applyFieldValues(created.id, phase.id, input.fields, userId, trx, actorRole);
      }

      return { card: created, fieldPairs };
    });

    await recomputeFormulasSafely(card.id, userId);
    await runTriggersSafely(pipelineId, { type: 'card_created_in_phase', cardId: card.id, phaseId: phase.id }, userId);
    await runFieldAutomations(pipelineId, card.id, userId, fieldPairs);

    return card;
  },

  async update(
    cardId: number,
    pipelineId: number,
    _userId: number,
    changes: { title?: string; due_date?: string | null }
  ) {
    await assertCardInPipeline(cardId, pipelineId);

    if (changes.title !== undefined) {
      const title = await sanitizeText(changes.title);
      if (!title) {
        throw new AppError('Título do card não pode ficar vazio', 422);
      }
      changes = { ...changes, title };
    }

    return CardModel.update(cardId, changes);
  },

  async addAssignee(cardId: number, pipelineId: number, userId: number, actingUserId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    await CardAssigneeModel.attach(cardId, userId);
    await CardHistoryModel.record({
      card_id: cardId,
      user_id: actingUserId,
      event_type: 'assigned',
      old_value: null,
      new_value: userId,
    });
    await NotificationService.notifyCardAssigned(cardId, userId, actingUserId);
    return CardAssigneeModel.listByCard(cardId);
  },

  async removeAssignee(cardId: number, pipelineId: number, userId: number, actingUserId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    await CardAssigneeModel.detach(cardId, userId);
    await CardHistoryModel.record({
      card_id: cardId,
      user_id: actingUserId,
      event_type: 'assigned',
      old_value: userId,
      new_value: null,
    });
    return CardAssigneeModel.listByCard(cardId);
  },

  async move(cardId: number, userId: number, toPhaseId: number, position?: number) {
    const card = await CardModel.findById(cardId);
    if (!card) {
      throw AppError.notFound('Card não encontrado');
    }

    const toPhase = await PhaseModel.findById(toPhaseId);
    if (!toPhase || toPhase.pipeline_id !== card.pipeline_id) {
      throw new AppError('Fase de destino inválida para este pipeline', 422);
    }

    if (toPhaseId === card.current_phase_id) {
      return card;
    }

    const actorRole = await resolveActorRole(card.pipeline_id, userId);
    const fromPhase = await PhaseModel.findById(card.current_phase_id);
    if (!roleAtLeast(actorRole, fromPhase?.min_move_out_role ?? 'editor')) {
      throw AppError.forbidden(`Você não tem permissão para tirar cards da fase "${fromPhase?.name}"`);
    }
    if (!roleAtLeast(actorRole, toPhase.min_move_in_role ?? 'editor')) {
      throw AppError.forbidden(`Você não tem permissão para mover cards para a fase "${toPhase.name}"`);
    }

    // regra: não é possível avançar sem preencher os campos obrigatórios da fase atual
    const currentFields = await CustomFieldModel.listByPhase(card.current_phase_id);
    const values = await CardFieldValueModel.listByCard(cardId);
    const valueMap = new Map(values.map((v) => [v.custom_field_id, v.value]));
    const missing = requiredFieldsMissing(currentFields, valueMap);
    if (missing.length > 0) {
      throw new AppError(
        `Preencha os campos obrigatórios antes de mover o card: ${missing.map((f) => f.label).join(', ')}`,
        422
      );
    }

    let finalPosition = position;
    if (finalPosition === undefined) {
      const { count } = (await CardModel.countInPhase(toPhaseId)) ?? { count: '0' };
      finalPosition = Number(count);
    }

    const fromPhaseId = card.current_phase_id;

    const updated = await db.transaction(async (trx) => {
      const [result] = await trx('cards')
        .where({ id: cardId })
        .update({
          current_phase_id: toPhaseId,
          position: finalPosition,
          current_phase_since: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning('*');

      await CardHistoryModel.record(
        {
          card_id: cardId,
          user_id: userId,
          event_type: 'moved',
          from_phase_id: fromPhaseId,
          to_phase_id: toPhaseId,
        },
        trx
      );

      return result;
    });

    await runTriggersSafely(card.pipeline_id, { type: 'card_moved_to_phase', cardId, fromPhaseId, toPhaseId }, userId);
    await runTriggersSafely(card.pipeline_id, { type: 'card_left_phase', cardId, fromPhaseId, toPhaseId }, userId);
    await AutomationService.checkAllConnectedCardsInPhase(cardId, userId).catch((err) =>
      logger.error({ err, cardId }, 'Falha ao verificar automações de cards conectados')
    );

    return updated;
  },

  async updateFields(cardId: number, userId: number, fields: Record<string, unknown>) {
    const card = await CardModel.findById(cardId);
    if (!card) {
      throw AppError.notFound('Card não encontrado');
    }
    const actorRole = await resolveActorRole(card.pipeline_id, userId);

    const fieldPairs = await db.transaction((trx) =>
      applyFieldValues(cardId, card.current_phase_id, fields, userId, trx, actorRole)
    );

    await recomputeFormulasSafely(cardId, userId);
    await runFieldAutomations(card.pipeline_id, cardId, userId, fieldPairs);

    return CardFieldValueModel.listByCard(cardId);
  },

  async delete(cardId: number, pipelineId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    return CardModel.delete(cardId);
  },
};
