/**
 * Importa cards (com valores de campo, labels, responsáveis, comentários e histórico de
 * fase reconstruído) dos pipes já estruturados por importStructure.ts. Idempotente via
 * card_external_refs (provider='pipefy'): card já importado é pulado.
 * Anexos NÃO são baixados aqui (ver importAttachments.ts). Vínculos `connector` são só
 * registrados em connector-links.jsonl pra importConnections.ts resolver depois.
 * Uso: npx ts-node --transpile-only scripts/pipefy/importCards.ts --pipes=123,456 [--limit-per-phase=5]
 */
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../src/config/db';
import { pipefyGraphQL, parseArgs, parsePipeIds } from './client';
import { isSkippedFieldType, isChecklistType } from './fieldMapping';
import { resolveOrCreateUser, createdPlaceholderAccounts } from './userResolver';

const CONNECTOR_LOG = path.join(__dirname, 'connector-links.jsonl');

interface PipefyCardField {
  field: { id: string; label: string; type: string };
  value: string | null;
  connectedRepoItems: { id: string; title: string }[] | null;
}

interface PipefyCard {
  id: string;
  title: string;
  current_phase: { id: string; name: string };
  createdAt: string;
  createdBy: { name: string; email: string } | null;
  assignees: { name: string; email: string }[];
  labels: { name: string }[];
  due_date: string | null;
  fields: PipefyCardField[];
  comments: { text: string; created_at: string; author: { name: string; email: string } | null }[];
  phases_history: { phase: { name: string }; firstTimeIn: string }[];
}

const CARD_FRAGMENT = `
  id
  title
  current_phase { id name }
  createdAt
  createdBy { name email }
  assignees { name email }
  labels { name }
  due_date
  fields {
    field { id label type }
    value
    connectedRepoItems { ... on PublicCard { id title } }
  }
  comments { text created_at author { name email } }
  phases_history { phase { name } firstTimeIn }
`;

function toDateOnly(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

/** best-effort: valores de checklist/select do Pipefy costumam vir como JSON array de strings */
function normalizeFieldValue(rawValue: string | null, fieldType: string): unknown {
  if (rawValue === null || rawValue === '') return null;
  if (isChecklistType(fieldType)) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) return parsed.join('; ');
    } catch {
      /* não era JSON, cai no valor cru abaixo */
    }
    return rawValue;
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {
    /* valor simples, não-JSON — segue abaixo */
  }
  return rawValue;
}

async function loadStructureMaps(pipefyPipeId: string) {
  const pipeline = await db('pipelines').where({ pipefy_pipe_id: pipefyPipeId }).first();
  if (!pipeline) throw new Error(`Pipeline pra pipe Pipefy ${pipefyPipeId} não encontrado — rode importStructure.ts primeiro`);

  const phases = await db('phases').where({ pipeline_id: pipeline.id }).select('id', 'name', 'pipefy_phase_id');
  const fields = await db('custom_fields')
    .join('phases', 'phases.id', 'custom_fields.phase_id')
    .where('phases.pipeline_id', pipeline.id)
    .select('custom_fields.id', 'custom_fields.pipefy_field_id');

  const phaseByPipefyId = new Map(phases.filter((p) => p.pipefy_phase_id).map((p) => [p.pipefy_phase_id as string, p.id as number]));
  const startPhaseId = phaseByPipefyId.get(`${pipefyPipeId}:start_form`);
  const phaseByName = new Map<string, number>();
  for (const p of phases) phaseByName.set(p.name, p.id);
  if (startPhaseId) phaseByName.set('Start form', startPhaseId);

  const fieldByPipefyId = new Map(fields.filter((f) => f.pipefy_field_id).map((f) => [f.pipefy_field_id as string, f.id as number]));

  return { pipelineId: pipeline.id as number, phaseByPipefyId, phaseByName, fieldByPipefyId };
}

const labelCache = new Map<string, number>();
async function resolveLabel(pipelineId: number, name: string): Promise<number> {
  const key = `${pipelineId}:${name}`;
  const cached = labelCache.get(key);
  if (cached) return cached;
  let row = await db('labels').where({ pipeline_id: pipelineId, name }).first();
  if (!row) {
    [row] = await db('labels').insert({ pipeline_id: pipelineId, name }).returning('*');
  }
  labelCache.set(key, row.id);
  return row.id;
}

async function importCard(
  card: PipefyCard,
  ctx: { pipelineId: number; phaseByPipefyId: Map<string, number>; phaseByName: Map<string, number>; fieldByPipefyId: Map<string, number>; pipefyPipeId: string }
) {
  const alreadyImported = await db('card_external_refs')
    .where({ provider: 'pipefy', external_type: 'card', external_id: card.id })
    .first();
  if (alreadyImported) return { imported: false };

  const currentPhaseId = ctx.phaseByPipefyId.get(card.current_phase.id);
  if (!currentPhaseId) {
    console.warn(`  aviso: card ${card.id} (${card.title}) está numa fase não mapeada (${card.current_phase.name}), pulando`);
    return { imported: false };
  }

  const creatorUserId = await resolveOrCreateUser(card.createdBy ?? { name: 'Desconhecido (Pipefy)', email: null });

  const currentPhaseHistoryEntry = [...card.phases_history].reverse().find((h) => h.phase.name === card.current_phase.name);
  const currentPhaseSince = currentPhaseHistoryEntry?.firstTimeIn ?? card.createdAt;

  const maxPosition = await db('cards').where({ current_phase_id: currentPhaseId }).max('position as max').first();
  const position = (maxPosition?.max ?? -1) + 1;

  const connectorEntries: { fieldLabel: string; connectedPipefyCardIds: string[] }[] = [];

  const newCardId = await db.transaction(async (trx) => {
    const [insertedCard] = await trx('cards')
      .insert({
        pipeline_id: ctx.pipelineId,
        current_phase_id: currentPhaseId,
        title: card.title.slice(0, 255) || `(sem título) ${card.id}`,
        created_by: creatorUserId,
        position,
        due_date: toDateOnly(card.due_date),
        current_phase_since: currentPhaseSince,
        created_at: card.createdAt,
        updated_at: card.createdAt,
      })
      .returning('*');

    for (const cf of card.fields) {
      if (isSkippedFieldType(cf.field.type)) {
        if (cf.field.type === 'connector' && cf.connectedRepoItems && cf.connectedRepoItems.length > 0) {
          connectorEntries.push({
            fieldLabel: cf.field.label,
            connectedPipefyCardIds: cf.connectedRepoItems.map((i) => i.id),
          });
        }
        continue;
      }
      const customFieldId = ctx.fieldByPipefyId.get(`${ctx.pipefyPipeId}:${cf.field.id}`);
      if (!customFieldId) continue;
      const value = normalizeFieldValue(cf.value, cf.field.type);
      if (value === null) continue;
      await trx('card_field_values')
        .insert({ card_id: insertedCard.id, custom_field_id: customFieldId, value: JSON.stringify(value) })
        .onConflict(['card_id', 'custom_field_id'])
        .merge({ value: JSON.stringify(value) });
    }

    for (const label of card.labels) {
      const labelId = await resolveLabel(ctx.pipelineId, label.name);
      await trx('card_labels').insert({ card_id: insertedCard.id, label_id: labelId }).onConflict(['card_id', 'label_id']).ignore();
    }

    for (const assignee of card.assignees) {
      const userId = await resolveOrCreateUser(assignee);
      await trx('card_assignees').insert({ card_id: insertedCard.id, user_id: userId }).onConflict(['card_id', 'user_id']).ignore();
    }

    for (const comment of card.comments) {
      const authorId = await resolveOrCreateUser(comment.author ?? { name: 'Desconhecido (Pipefy)', email: null });
      await trx('comments').insert({
        card_id: insertedCard.id,
        user_id: authorId,
        body: comment.text,
        created_at: comment.created_at,
        updated_at: comment.created_at,
      });
    }

    const history = card.phases_history;
    let previousPhaseId: number | undefined;
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const toPhaseId = ctx.phaseByName.get(entry.phase.name);
      if (!toPhaseId) continue;
      if (i === 0) {
        await trx('card_history').insert({
          card_id: insertedCard.id,
          user_id: creatorUserId,
          event_type: 'created',
          to_phase_id: toPhaseId,
          created_at: entry.firstTimeIn,
        });
      } else if (previousPhaseId && previousPhaseId !== toPhaseId) {
        await trx('card_history').insert({
          card_id: insertedCard.id,
          user_id: creatorUserId,
          event_type: 'moved',
          from_phase_id: previousPhaseId,
          to_phase_id: toPhaseId,
          created_at: entry.firstTimeIn,
        });
      }
      previousPhaseId = toPhaseId;
    }

    await trx('card_external_refs').insert({
      card_id: insertedCard.id,
      provider: 'pipefy',
      external_id: card.id,
      external_type: 'card',
      last_synced_at: trx.fn.now(),
    });

    return insertedCard.id as number;
  });

  if (connectorEntries.length > 0) {
    fs.appendFileSync(
      CONNECTOR_LOG,
      JSON.stringify({ ourCardId: newCardId, pipefyPipeId: ctx.pipefyPipeId, connectors: connectorEntries }) + '\n'
    );
  }

  return { imported: true };
}

async function importCardsForPipe(pipefyPipeId: string, limitPerPhase: number | null) {
  const ctx = { ...(await loadStructureMaps(pipefyPipeId)), pipefyPipeId };

  const phasesData = await pipefyGraphQL<{ pipe: { phases: { id: string; name: string; cards_count: number }[] } }>(
    `query($id: ID!) { pipe(id: $id) { phases { id name cards_count } } }`,
    { id: pipefyPipeId }
  );

  let importedCount = 0;
  let skippedCount = 0;

  for (const phase of phasesData.pipe.phases) {
    if (phase.cards_count === 0) continue;
    let after: string | null = null;
    let fetchedInPhase = 0;
    const pageSize = limitPerPhase ? Math.min(limitPerPhase, 50) : 50;

    while (true) {
      const data: { phase: { cards: { edges: { node: PipefyCard }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } } =
        await pipefyGraphQL(
          `query($id: ID!, $first: Int!, $after: String) {
            phase(id: $id) {
              cards(first: $first, after: $after) {
                edges { node { ${CARD_FRAGMENT} } }
                pageInfo { hasNextPage endCursor }
              }
            }
          }`,
          { id: phase.id, first: pageSize, after }
        );

      for (const edge of data.phase.cards.edges) {
        const result = await importCard(edge.node, ctx);
        if (result.imported) importedCount += 1;
        else skippedCount += 1;
        fetchedInPhase += 1;
        if (limitPerPhase && fetchedInPhase >= limitPerPhase) break;
      }

      if (limitPerPhase && fetchedInPhase >= limitPerPhase) break;
      if (!data.phase.cards.pageInfo.hasNextPage) break;
      after = data.phase.cards.pageInfo.endCursor;
    }
  }

  console.log(`  ${importedCount} cards importados, ${skippedCount} já existiam/pulados.`);
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const pipesArg = flags.pipes;
  if (!pipesArg || typeof pipesArg !== 'string') {
    throw new Error('Uso: --pipes=<id1>,<id2>,... [--limit-per-phase=N]');
  }
  const pipeIds = parsePipeIds(pipesArg);
  const limitPerPhase = flags['limit-per-phase'] ? Number(flags['limit-per-phase']) : null;

  for (let i = 0; i < pipeIds.length; i++) {
    console.log(`[${i + 1}/${pipeIds.length}] pipe ${pipeIds[i]}`);
    await importCardsForPipe(pipeIds[i], limitPerPhase);
  }

  if (createdPlaceholderAccounts.length > 0) {
    console.log(`\n${createdPlaceholderAccounts.length} conta(s) nova(s) criada(s) com senha padrão:`);
    for (const acc of createdPlaceholderAccounts) {
      console.log(`  - ${acc.name} <${acc.placeholderEmail}> (Pipefy: ${acc.realEmail})`);
    }
  }
}

main()
  .catch((err) => {
    console.error('ERRO:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
