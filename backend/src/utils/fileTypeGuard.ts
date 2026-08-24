import { AppError } from './AppError';

// Formatos binários aceitos como anexo, verificados pelos magic bytes reais do arquivo
// (não pelo Content-Type/nome que o cliente informa, que é só um rótulo confiável zero).
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

// Texto puro não tem magic bytes pra detectar — só aceita pelo Content-Type declarado
// quando a sondagem de conteúdo não encontrou nenhuma assinatura binária conhecida.
const TEXT_FALLBACK_MIME_TYPES = new Set(['text/plain', 'text/csv']);

/**
 * Confere o conteúdo real do arquivo (magic bytes) antes de aceitar um anexo — sem isso,
 * qualquer arquivo passa disfarçado de imagem só trocando a extensão/Content-Type
 * declarados (confirmado nesta auditoria: um .txt foi salvo como "image/jpeg" só pelo
 * nome enviado). Retorna o mime type verificado pra usar no lugar do declarado pelo
 * cliente. `file-type` é ESM-only — import dinâmico pra funcionar neste backend CommonJS.
 */
export async function assertSafeFileContent(buffer: Buffer, declaredMimetype: string): Promise<string> {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (detected) {
    if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new AppError(`Tipo de arquivo não permitido: "${detected.mime}"`, 422);
    }
    return detected.mime;
  }

  // Sem assinatura detectável: só aceita se o próprio cliente já declarou um tipo de
  // texto simples — qualquer outra alegação (ex. "isto é uma imagem") é rejeitada.
  if (TEXT_FALLBACK_MIME_TYPES.has(declaredMimetype)) {
    return declaredMimetype;
  }

  throw new AppError('Não foi possível verificar o tipo deste arquivo', 422);
}
