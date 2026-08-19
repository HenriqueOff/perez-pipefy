import { db } from '../config/db';
import { AttachmentRow } from '../types/entities';

const TABLE = 'attachments';

export const AttachmentModel = {
  listByCard(cardId: number) {
    return db<AttachmentRow>(TABLE)
      .join('users', 'users.id', 'attachments.uploaded_by')
      .where({ card_id: cardId })
      .select('attachments.*', 'users.name as uploader_name')
      .orderBy('attachments.created_at', 'desc');
  },

  create(input: {
    card_id: number;
    uploaded_by: number;
    file_name: string;
    file_path: string;
    mime_type: string;
    size: number;
  }) {
    return db<AttachmentRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  findById(id: number) {
    return db<AttachmentRow>(TABLE).where({ id }).first();
  },

  delete(id: number) {
    return db<AttachmentRow>(TABLE).where({ id }).delete();
  },
};
