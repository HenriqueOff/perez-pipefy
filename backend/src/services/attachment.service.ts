import { db } from '../config/db';
import { AttachmentModel } from '../models/attachment.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { CardModel } from '../models/card.model';
import { StorageService } from './storage.service';
import { AppError } from '../utils/AppError';

export const AttachmentService = {
  listByCard(cardId: number) {
    return AttachmentModel.listByCard(cardId);
  },

  async create(
    cardId: number,
    userId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ) {
    const card = await CardModel.findById(cardId);
    if (!card) {
      throw AppError.notFound('Card não encontrado');
    }

    const key = await StorageService.save(cardId, file);

    return db.transaction(async (trx) => {
      const [attachment] = await trx('attachments')
        .insert({
          card_id: cardId,
          uploaded_by: userId,
          file_name: file.originalname,
          file_path: key,
          mime_type: file.mimetype,
          size: file.size,
        })
        .returning('*');

      await CardHistoryModel.record(
        { card_id: cardId, user_id: userId, event_type: 'attachment_added', new_value: file.originalname },
        trx
      );

      return attachment;
    });
  },

  async findForCard(cardId: number, attachmentId: number) {
    const attachment = await AttachmentModel.findById(attachmentId);
    if (!attachment || attachment.card_id !== cardId) {
      throw AppError.notFound('Anexo não encontrado');
    }
    return attachment;
  },

  async delete(attachmentId: number) {
    const attachment = await AttachmentModel.findById(attachmentId);
    if (!attachment) {
      throw AppError.notFound('Anexo não encontrado');
    }
    await AttachmentModel.delete(attachmentId);
    await StorageService.remove(attachment.file_path);
  },
};
