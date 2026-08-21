import { db } from '../config/db';
import { NotificationModel } from '../models/notification.model';
import { CardAssigneeModel } from '../models/cardAssignee.model';
import { CardModel } from '../models/card.model';
import { UserModel } from '../models/user.model';
import { AutomationService } from './automation.service';
import { logger } from '../utils/logger';

export const NotificationService = {
  listForUser(userId: number) {
    return NotificationModel.listForUser(userId);
  },

  async countUnread(userId: number) {
    const { count } = (await NotificationModel.countUnread(userId)) ?? { count: '0' };
    return Number(count);
  },

  markRead(id: number, userId: number) {
    return NotificationModel.markRead(id, userId);
  },

  markAllRead(userId: number) {
    return NotificationModel.markAllRead(userId);
  },

  async notifyCardAssigned(
    cardId: number,
    assignedUserId: number,
    actingUserId: number | null,
    task?: { dueDate?: string | null; note?: string | null }
  ) {
    if (assignedUserId === actingUserId) return;
    const [card, actor] = await Promise.all([
      CardModel.findById(cardId),
      actingUserId != null ? UserModel.findById(actingUserId) : Promise.resolve(null),
    ]);
    if (!card) return;
    if (actingUserId != null && !actor) return;
    const actorName = actor?.name ?? 'Uma automação';
    let message = `${actorName} atribuiu você ao card "${card.title}".`;
    if (task?.dueDate) message += ` Prazo: ${task.dueDate}.`;
    if (task?.note) message += ` Observação: ${task.note}`;
    await NotificationModel.create({
      user_id: assignedUserId,
      type: 'card_assigned',
      message,
      card_id: card.id,
      pipeline_id: card.pipeline_id,
    });
  },

  async notifyCommentAdded(cardId: number, authorId: number, body: string) {
    const [card, author, assignees] = await Promise.all([
      CardModel.findById(cardId),
      UserModel.findById(authorId),
      CardAssigneeModel.listByCard(cardId),
    ]);
    if (!card || !author) return;
    const snippet = body.length > 80 ? `${body.slice(0, 80)}…` : body;
    const recipients = assignees.filter((a) => a.user_id !== authorId);
    for (const recipient of recipients) {
      await NotificationModel.create({
        user_id: recipient.user_id,
        type: 'comment_added',
        message: `${author.name} comentou no card "${card.title}": ${snippet}`,
        card_id: card.id,
        pipeline_id: card.pipeline_id,
      });
    }
  },

  async scanSlaBreaches() {
    const now = Date.now();
    const rows = await db('cards')
      .join('phases', 'phases.id', 'cards.current_phase_id')
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .where((qb) => qb.whereNotNull('phases.sla_hours').orWhereNotNull('cards.sla_override_hours'))
      .andWhere('pipelines.archived', false)
      .select<
        {
          card_id: number;
          title: string;
          pipeline_id: number;
          current_phase_since: Date;
          sla_hours: number | null;
          sla_override_hours: number | null;
          phase_id: number;
          phase_name: string;
        }[]
      >(
        'cards.id as card_id',
        'cards.title',
        'cards.pipeline_id',
        'cards.current_phase_since',
        'phases.sla_hours',
        'cards.sla_override_hours',
        'phases.id as phase_id',
        'phases.name as phase_name'
      );

    for (const row of rows) {
      const effectiveSlaHours = row.sla_override_hours ?? row.sla_hours;
      if (effectiveSlaHours == null) continue;
      const elapsedHours = (now - new Date(row.current_phase_since).getTime()) / 3600000;
      if (elapsedHours <= effectiveSlaHours) continue;

      const already = await NotificationModel.existsForCardSinceType(
        row.card_id,
        'sla_breached',
        row.current_phase_since
      );
      if (already) continue;

      const assignees = await CardAssigneeModel.listByCard(row.card_id);
      for (const assignee of assignees) {
        await NotificationModel.create({
          user_id: assignee.user_id,
          type: 'sla_breached',
          message: `O card "${row.title}" está há mais de ${effectiveSlaHours}h na fase "${row.phase_name}".`,
          card_id: row.card_id,
          pipeline_id: row.pipeline_id,
        });
      }

      await AutomationService.runTriggers(
        row.pipeline_id,
        { type: 'sla_breached', cardId: row.card_id, phaseId: row.phase_id, slaHours: effectiveSlaHours },
        null
      ).catch((err) => logger.error({ err, cardId: row.card_id }, 'Falha ao disparar automações de SLA'));
    }
  },
};
