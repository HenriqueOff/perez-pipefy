/**
 * Reconstrói vínculos de campos `connector` do Pipefy como card_connections de verdade.
 * Lê o connector-links.jsonl gravado por importCards.ts. Só resolve um vínculo se AMBOS
 * os cards já tiverem sido importados (via card_external_refs) — os que não derem, ficam
 * registrados como pendentes no final (resolver depois de importar o pipe do outro lado).
 * Uso: npx ts-node --transpile-only scripts/pipefy/importConnections.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../src/config/db';
import { PipelineConnectionModel } from '../../src/models/pipelineConnection.model';
import { CardConnectionModel } from '../../src/models/cardConnection.model';

const CONNECTOR_LOG = path.join(__dirname, 'connector-links.jsonl');

interface ConnectorLine {
  ourCardId: number;
  pipefyPipeId: string;
  connectors: { fieldLabel: string; connectedPipefyCardIds: string[] }[];
}

const pipelineConnectionCache = new Map<string, number>();
async function resolvePipelineConnection(ownerPipelineId: number, targetPipelineId: number, name: string): Promise<number> {
  const key = `${ownerPipelineId}:${targetPipelineId}:${name}`;
  const cached = pipelineConnectionCache.get(key);
  if (cached) return cached;

  let row = await db('pipeline_connections').where({ owner_pipeline_id: ownerPipelineId, target_pipeline_id: targetPipelineId, name }).first();
  if (!row) {
    row = await PipelineConnectionModel.create({ owner_pipeline_id: ownerPipelineId, target_pipeline_id: targetPipelineId, name });
  }
  pipelineConnectionCache.set(key, row.id);
  return row.id;
}

async function main() {
  if (!fs.existsSync(CONNECTOR_LOG)) {
    console.log('Nenhum connector-links.jsonl encontrado — nenhum campo connector foi visto na importação de cards.');
    return;
  }

  const lines = fs
    .readFileSync(CONNECTOR_LOG, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ConnectorLine);

  let created = 0;
  let alreadyExisted = 0;
  const pending: { ourCardId: number; fieldLabel: string; missingPipefyCardId: string }[] = [];

  for (const line of lines) {
    const ownerCard = await db('cards').where({ id: line.ourCardId }).first();
    if (!ownerCard) continue;

    for (const connector of line.connectors) {
      for (const pipefyCardId of connector.connectedPipefyCardIds) {
        const ref = await db('card_external_refs')
          .where({ provider: 'pipefy', external_type: 'card', external_id: pipefyCardId })
          .first();
        if (!ref) {
          pending.push({ ourCardId: line.ourCardId, fieldLabel: connector.fieldLabel, missingPipefyCardId: pipefyCardId });
          continue;
        }
        const targetCard = await db('cards').where({ id: ref.card_id }).first();
        if (!targetCard) continue;

        const pipelineConnectionId = await resolvePipelineConnection(ownerCard.pipeline_id, targetCard.pipeline_id, connector.fieldLabel);

        const existing = await CardConnectionModel.findOne(pipelineConnectionId, ownerCard.id, targetCard.id);
        if (existing) {
          alreadyExisted += 1;
          continue;
        }
        await CardConnectionModel.create({
          pipeline_connection_id: pipelineConnectionId,
          owner_card_id: ownerCard.id,
          target_card_id: targetCard.id,
        });
        created += 1;
      }
    }
  }

  console.log(`${created} conexões criadas, ${alreadyExisted} já existiam.`);
  if (pending.length > 0) {
    console.log(`${pending.length} vínculo(s) pendente(s) — card do outro lado ainda não foi importado:`);
    for (const p of pending.slice(0, 30)) {
      console.log(`  - card ${p.ourCardId}, campo "${p.fieldLabel}" -> card Pipefy ${p.missingPipefyCardId} (não importado ainda)`);
    }
  }
}

main()
  .catch((err) => {
    console.error('ERRO:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
