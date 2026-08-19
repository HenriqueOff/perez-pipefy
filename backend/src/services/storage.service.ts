import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new Error('Supabase Storage não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)');
    }
    supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  }
  return supabaseClient;
}

function buildObjectKey(cardId: number, originalName: string): string {
  const unique = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalName);
  return `card-${cardId}/${unique}${ext}`;
}

/**
 * "key" é tratada como uma string opaca pelo resto do app (é o que fica salvo em
 * attachments.file_path): no driver local é um caminho relativo dentro de uploads/,
 * no driver supabase é o caminho do objeto dentro do bucket. Trocar de driver não
 * exige migração — anexos antigos continuam com a key do driver em que foram salvos,
 * só passam a ser resolvidos pelo driver ativo no momento do download/remoção.
 */
export const StorageService = {
  async save(cardId: number, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    const key = buildObjectKey(cardId, file.originalname);

    if (env.storageDriver === 'supabase') {
      const client = getSupabaseClient();
      const { error } = await client.storage
        .from(env.supabaseStorageBucket)
        .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) {
        throw new Error(`Falha ao enviar anexo para o Supabase Storage: ${error.message}`);
      }
      return key;
    }

    const destination = path.join(LOCAL_UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.buffer);
    return key;
  },

  async remove(key: string): Promise<void> {
    if (env.storageDriver === 'supabase') {
      const client = getSupabaseClient();
      const { error } = await client.storage.from(env.supabaseStorageBucket).remove([key]);
      if (error) {
        logger.warn({ err: error, key }, 'Falha ao remover anexo do Supabase Storage');
      }
      return;
    }

    await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key)).catch(() => undefined);
  },

  async respondWithFile(res: Response, key: string, fileName: string): Promise<void> {
    if (env.storageDriver === 'supabase') {
      // Baixa o arquivo aqui no servidor e repassa pro navegador (em vez de redirecionar pra
      // URL assinada do Supabase): o frontend chama esse endpoint com withCredentials: true, e
      // um redirect cross-origin pra *.supabase.co quebra no navegador porque o Supabase
      // Storage não libera Access-Control-Allow-Credentials pra requisições autenticadas.
      const client = getSupabaseClient();
      const { data, error } = await client.storage.from(env.supabaseStorageBucket).download(key);
      if (error || !data) {
        throw new Error(`Falha ao baixar anexo do Supabase Storage: ${error?.message}`);
      }
      res.attachment(fileName);
      res.send(Buffer.from(await data.arrayBuffer()));
      return;
    }

    res.download(path.join(LOCAL_UPLOAD_DIR, key), fileName);
  },
};

if (env.storageDriver === 'local') {
  fsSync.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}
