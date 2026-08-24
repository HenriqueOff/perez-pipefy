/**
 * Baixa os anexos dos cards já importados (via importCards.ts) e reenvia pro nosso Storage.
 * Busca a URL assinada de novo na hora (em vez de reaproveitar a capturada durante
 * importCards.ts), já que essas URLs expiram. Idempotente via attachments.pipefy_attachment_path.
 * Uso: npx ts-node --transpile-only scripts/pipefy/importAttachments.ts --pipes=123,456
 */
import path from 'node:path';
import { db } from '../../src/config/db';
import { StorageService } from '../../src/services/storage.service';
import { pipefyGraphQL, parseArgs, parsePipeIds } from './client';

async function importAttachmentsForPipe(pipefyPipeId: string) {
  const pipeline = await db('pipelines').where({ pipefy_pipe_id: pipefyPipeId }).first();
  if (!pipeline) {
    console.warn(`  pipeline pra pipe Pipefy ${pipefyPipeId} não encontrado, pulando`);
    return;
  }

  const cards = await db('cards')
    .join('card_external_refs', 'card_external_refs.card_id', 'cards.id')
    .where('cards.pipeline_id', pipeline.id)
    .andWhere('card_external_refs.provider', 'pipefy')
    .andWhere('card_external_refs.external_type', 'card')
    .select('cards.id as card_id', 'cards.created_by', 'card_external_refs.external_id as pipefy_card_id');

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const card of cards) {
    let attachments: { path: string; url: string }[];
    try {
      const data = await pipefyGraphQL<{ card: { attachments: { path: string; url: string }[] } | null }>(
        `query($id: ID!) { card(id: $id) { attachments { path url } } }`,
        { id: card.pipefy_card_id }
      );
      attachments = data.card?.attachments ?? [];
    } catch (err) {
      console.warn(`  falha ao buscar anexos do card Pipefy ${card.pipefy_card_id}:`, err);
      continue;
    }

    for (const att of attachments) {
      const existing = await db('attachments').where({ card_id: card.card_id, pipefy_attachment_path: att.path }).first();
      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        const res = await fetch(att.url);
        if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const originalname = path.basename(att.path);
        const mimetype = res.headers.get('content-type') ?? 'application/octet-stream';

        const key = await StorageService.save(card.card_id, { buffer, originalname, mimetype });
        await db('attachments').insert({
          card_id: card.card_id,
          uploaded_by: card.created_by,
          file_name: originalname,
          file_path: key,
          mime_type: mimetype,
          size: buffer.length,
          pipefy_attachment_path: att.path,
        });
        uploaded += 1;
      } catch (err) {
        failed += 1;
        console.warn(`  falha ao importar anexo "${att.path}" do card ${card.card_id}:`, err);
      }
    }
  }

  console.log(`  ${uploaded} anexos enviados, ${skipped} já existiam, ${failed} falharam.`);
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const pipesArg = flags.pipes;
  if (!pipesArg || typeof pipesArg !== 'string') {
    throw new Error('Uso: --pipes=<id1>,<id2>,...');
  }
  const pipeIds = parsePipeIds(pipesArg);

  for (let i = 0; i < pipeIds.length; i++) {
    console.log(`[${i + 1}/${pipeIds.length}] pipe ${pipeIds[i]}`);
    await importAttachmentsForPipe(pipeIds[i]);
  }
}

main()
  .catch((err) => {
    console.error('ERRO:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
