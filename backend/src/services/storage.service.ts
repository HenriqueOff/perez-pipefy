import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Response } from 'express';

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

function buildObjectKey(cardId: number, originalName: string): string {
  const unique = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalName);
  return `card-${cardId}/${unique}${ext}`;
}

/**
 * "key" é tratada como uma string opaca pelo resto do app (é o que fica salvo em
 * attachments.file_path): é o caminho relativo do anexo dentro de uploads/.
 */
export const StorageService = {
  async save(cardId: number, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    const key = buildObjectKey(cardId, file.originalname);

    const destination = path.join(LOCAL_UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.buffer);
    return key;
  },

  async remove(key: string): Promise<void> {
    await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key)).catch(() => undefined);
  },

  async respondWithFile(res: Response, key: string, fileName: string): Promise<void> {
    res.download(path.join(LOCAL_UPLOAD_DIR, key), fileName);
  },
};

fsSync.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
