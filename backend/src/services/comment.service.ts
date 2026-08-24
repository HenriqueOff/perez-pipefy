import { db } from '../config/db';
import { CardHistoryModel } from '../models/cardHistory.model';
import { CommentModel } from '../models/comment.model';
import { AppError } from '../utils/AppError';
import { assertCardInPipeline } from '../utils/assertOwnership';
import { sanitizeText } from '../utils/sanitizeText';
import { NotificationService } from './notification.service';

export const CommentService = {
  async listByCard(cardId: number, pipelineId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    return CommentModel.listByCard(cardId);
  },

  async create(cardId: number, pipelineId: number, userId: number, rawBody: string) {
    await assertCardInPipeline(cardId, pipelineId);
    const body = await sanitizeText(rawBody);
    if (!body) {
      throw new AppError('Comentário não pode ficar vazio', 422);
    }

    const comment = await db.transaction(async (trx) => {
      const [created] = await trx('comments').insert({ card_id: cardId, user_id: userId, body }).returning('*');
      await CardHistoryModel.record(
        { card_id: cardId, user_id: userId, event_type: 'comment_added', new_value: body },
        trx
      );
      return created;
    });

    await NotificationService.notifyCommentAdded(cardId, userId, body);
    return comment;
  },

  async delete(commentId: number, pipelineId: number, userId: number, isAdmin: boolean) {
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      throw AppError.notFound('Comentário não encontrado');
    }
    await assertCardInPipeline(comment.card_id, pipelineId);
    if (comment.user_id !== userId && !isAdmin) {
      throw AppError.forbidden('Você só pode excluir seus próprios comentários');
    }
    return CommentModel.delete(commentId);
  },
};
