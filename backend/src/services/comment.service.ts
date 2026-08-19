import { db } from '../config/db';
import { CardModel } from '../models/card.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { CommentModel } from '../models/comment.model';
import { AppError } from '../utils/AppError';
import { NotificationService } from './notification.service';

export const CommentService = {
  listByCard(cardId: number) {
    return CommentModel.listByCard(cardId);
  },

  async create(cardId: number, userId: number, body: string) {
    const card = await CardModel.findById(cardId);
    if (!card) {
      throw AppError.notFound('Card não encontrado');
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

  async delete(commentId: number, userId: number, isAdmin: boolean) {
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      throw AppError.notFound('Comentário não encontrado');
    }
    if (comment.user_id !== userId && !isAdmin) {
      throw AppError.forbidden('Você só pode excluir seus próprios comentários');
    }
    return CommentModel.delete(commentId);
  },
};
