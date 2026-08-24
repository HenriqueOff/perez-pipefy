/**
 * Importa automações do Pipefy como rascunhos SEMPRE INATIVOS (active=false) — gatilho/ação
 * mapeados quando dá, config detalhada guardada crua em trigger_config/action_config.pipefy_raw
 * pra consulta manual. O usuário revisa e ativa cada uma pela tela de automações.
 * Uso: npx ts-node --transpile-only scripts/pipefy/importAutomations.ts --pipes=123,456
 */
import { db } from '../../src/config/db';
import { AutomationModel } from '../../src/models/automation.model';
import { AutomationTriggerType, AutomationActionType } from '../../src/types/enums';
import { PIPEFY_ORG_ID, pipefyGraphQL, parseArgs, parsePipeIds } from './client';

const MAPPABLE_TRIGGERS: Record<string, AutomationTriggerType> = {
  card_created: 'card_created_in_phase',
  card_moved: 'card_moved_to_phase',
  field_updated: 'field_updated',
};
const MAPPABLE_ACTIONS: Record<string, AutomationActionType> = {
  update_card_field: 'update_field',
  send_email_template: 'send_email_template',
  send_http_request: 'http_request',
};

interface PipefyAutomation {
  id: string;
  name: string;
  active: boolean;
  event_id: string;
  action_id: string;
}

async function importAutomationsForPipe(pipefyPipeId: string, manualReviewList: string[]) {
  const pipeline = await db('pipelines').where({ pipefy_pipe_id: pipefyPipeId }).first();
  if (!pipeline) {
    console.warn(`  pipeline pra pipe Pipefy ${pipefyPipeId} não encontrado, pulando`);
    return;
  }

  let automations: PipefyAutomation[];
  try {
    const data = await pipefyGraphQL<{ automations: { edges: { node: PipefyAutomation }[] } }>(
      `query($orgId: ID!, $repoId: ID) {
        automations(organizationId: $orgId, repoId: $repoId, first: 100) {
          edges { node { id name active event_id action_id } }
        }
      }`,
      { orgId: PIPEFY_ORG_ID, repoId: pipefyPipeId }
    );
    automations = data.automations.edges.map((e) => e.node);
  } catch (err: any) {
    if (String(err.message).includes('PERMISSION_DENIED') || String(err.message).includes('Acesso negado')) {
      manualReviewList.push(`Pipe ${pipefyPipeId}: sem permissão pra ler automações — recriar manualmente se houver.`);
      return;
    }
    throw err;
  }

  let created = 0;
  let skippedExisting = 0;

  for (const automation of automations) {
    const existing = await db('automations').where({ pipeline_id: pipeline.id, name: automation.name }).first();
    if (existing) {
      skippedExisting += 1;
      continue;
    }

    const triggerType = MAPPABLE_TRIGGERS[automation.event_id];
    const actionType = MAPPABLE_ACTIONS[automation.action_id];
    if (!triggerType || !actionType) {
      manualReviewList.push(
        `"${automation.name}" (pipe ${pipefyPipeId}): gatilho "${automation.event_id}" / ação "${automation.action_id}" sem mapeamento automático.`
      );
      continue;
    }

    await AutomationModel.create({
      pipeline_id: pipeline.id,
      name: automation.name,
      trigger_type: triggerType,
      trigger_config: { pipefy_raw: { automation_id: automation.id, event_id: automation.event_id } },
      action_type: actionType,
      action_config: { pipefy_raw: { automation_id: automation.id, action_id: automation.action_id } },
      active: false,
    });
    created += 1;
    manualReviewList.push(`"${automation.name}" (pipe ${pipefyPipeId}): importada INATIVA — revisar config antes de ativar.`);
  }

  console.log(`  ${created} automações criadas (inativas), ${skippedExisting} já existiam.`);
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const pipesArg = flags.pipes;
  if (!pipesArg || typeof pipesArg !== 'string') {
    throw new Error('Uso: --pipes=<id1>,<id2>,...');
  }
  const pipeIds = parsePipeIds(pipesArg);
  const manualReviewList: string[] = [];

  for (let i = 0; i < pipeIds.length; i++) {
    console.log(`[${i + 1}/${pipeIds.length}] pipe ${pipeIds[i]}`);
    await importAutomationsForPipe(pipeIds[i], manualReviewList);
  }

  if (manualReviewList.length > 0) {
    console.log('\n=== Revisão manual ===');
    for (const line of manualReviewList) console.log(`  - ${line}`);
  }
}

main()
  .catch((err) => {
    console.error('ERRO:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
