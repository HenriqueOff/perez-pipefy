import path from 'node:path';
import { db } from '../config/db';
import { AttachmentModel } from '../models/attachment.model';
import { CardHistoryModel } from '../models/cardHistory.model';
import { StorageService } from './storage.service';
import { AppError } from '../utils/AppError';
import { assertCardInPipeline } from '../utils/assertOwnership';
import { assertSafeFileContent } from '../utils/fileTypeGuard';
import { sanitizeText } from '../utils/sanitizeText';

// Nome exibido pro usuário — diferente da chave de armazenamento (já aleatória, sem
// relação com o nome enviado), sanitizamos só pra não guardar HTML/script no rótulo. Se
// sanitizar apagar o nome inteiro (ex. era só `<script>...</script>`), mantém a extensão
// original em vez de rejeitar o upload por causa do nome.
async function sanitizeFileName(originalname: string): Promise<string> {
  const sanitized = await sanitizeText(originalname);
  if (sanitized) return sanitized;
  const ext = path.extname(originalname);
  return `arquivo${ext}`;
}

export const AttachmentService = {
  async listByCard(cardId: number, pipelineId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    return AttachmentModel.listByCard(cardId);
  },

  async create(
    cardId: number,
    pipelineId: number,
    userId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ) {
    await assertCardInPipeline(cardId, pipelineId);
    const verifiedMimeType = await assertSafeFileContent(file.buffer, file.mimetype);
    const fileName = await sanitizeFileName(file.originalname);

    const key = await StorageService.save(cardId, file);

    return db.transaction(async (trx) => {
      const [attachment] = await trx('attachments')
        .insert({
          card_id: cardId,
          uploaded_by: userId,
          file_name: fileName,
          file_path: key,
          mime_type: verifiedMimeType,
          size: file.size,
        })
        .returning('*');

      await CardHistoryModel.record(
        { card_id: cardId, user_id: userId, event_type: 'attachment_added', new_value: fileName },
        trx
      );

      return attachment;
    });
  },

  async findForCard(cardId: number, pipelineId: number, attachmentId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    const attachment = await AttachmentModel.findById(attachmentId);
    if (!attachment || attachment.card_id !== cardId) {
      throw AppError.notFound('Anexo não encontrado');
    }
    return attachment;
  },

  async delete(attachmentId: number, pipelineId: number) {
    const attachment = await AttachmentModel.findById(attachmentId);
    if (!attachment) {
      throw AppError.notFound('Anexo não encontrado');
    }
    await assertCardInPipeline(attachment.card_id, pipelineId);
    await AttachmentModel.delete(attachmentId);
    await StorageService.remove(attachment.file_path);
  },
};
