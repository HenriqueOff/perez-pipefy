/**
 * Relatório só-leitura: não escreve nada no banco nem no Pipefy. Varre os 16 pipes da
 * organização e imprime o que a importação real vai fazer, pra revisar antes de rodar
 * qualquer coisa que escreve. Uso: npx ts-node --transpile-only scripts/pipefy/exploreMapping.ts
 */
import { PIPEFY_ORG_ID, pipefyGraphQL } from './client';
import { isKnownFieldType, mapFieldType } from './fieldMapping';

interface PipeSummary {
  id: string;
  name: string;
  cards_count: number;
  phases: { id: string; name: string; cards_count: number }[];
}

const MAPPABLE_TRIGGERS: Record<string, string> = {
  card_created: 'card_created_in_phase',
  card_moved: 'card_moved_to_phase',
  field_updated: 'field_updated',
};
const MAPPABLE_ACTIONS: Record<string, string> = {
  update_card_field: 'update_field',
  send_email_template: 'send_email_template',
  send_http_request: 'http_request',
};

async function main() {
  const orgData = await pipefyGraphQL<{ organization: { pipes: PipeSummary[] } }>(
    `query($id: ID!) {
      organization(id: $id) {
        pipes { id name cards_count phases { id name cards_count } }
      }
    }`,
    { id: PIPEFY_ORG_ID }
  );

  const pipes = orgData.organization.pipes;
  const totalCards = pipes.reduce((s, p) => s + p.cards_count, 0);
  console.log(`\n=== ${pipes.length} pipes, ${totalCards} cards no total ===\n`);

  const pilotPipes = [...pipes].sort((a, b) => a.cards_count - b.cards_count).slice(0, 5);
  console.log('Piloto recomendado (5 menores pipes):');
  for (const p of pilotPipes) console.log(`  - ${p.name} (id ${p.id}, ${p.cards_count} cards)`);
  console.log(`\n--pipes=${pilotPipes.map((p) => p.id).join(',')}\n`);

  const fieldTypeTally = new Map<string, number>();
  const unknownFieldLabels: string[] = [];
  const authorSample = new Map<string, string>(); // email -> name
  let permissionDeniedPipes: string[] = [];
  let automationTally = { total: 0, mappable: 0, unmappable: 0 };

  for (const pipe of pipes) {
    const structure = await pipefyGraphQL<{
      pipe: { start_form_fields: { id: string; label: string; type: string }[]; phases: { fields: { id: string; label: string; type: string }[] }[] };
    }>(
      `query($id: ID!) {
        pipe(id: $id) {
          start_form_fields { id label type }
          phases { fields { id label type } }
        }
      }`,
      { id: pipe.id }
    );

    const allFields = [
      ...structure.pipe.start_form_fields,
      ...structure.pipe.phases.flatMap((ph) => ph.fields),
    ];
    for (const f of allFields) {
      fieldTypeTally.set(f.type, (fieldTypeTally.get(f.type) ?? 0) + 1);
      if (!isKnownFieldType(f.type) && !['label_select', 'assignee_select', 'attachment', 'connector', 'statement'].includes(f.type)) {
        unknownFieldLabels.push(`${pipe.name} / ${f.label} (${f.type})`);
      }
    }

    // amostra: primeira fase com cards, primeira página, só pra ter uma ideia de autores
    const firstPhaseWithCards = pipe.phases.find((ph) => ph.cards_count > 0);
    if (firstPhaseWithCards) {
      const sample = await pipefyGraphQL<{ phase: { cards: { edges: { node: { createdBy: { name: string; email: string } | null } }[] } } }>(
        `query($id: ID!) {
          phase(id: $id) {
            cards(first: 20) { edges { node { createdBy { name email } } } }
          }
        }`,
        { id: firstPhaseWithCards.id }
      );
      for (const edge of sample.phase.cards.edges) {
        const author = edge.node.createdBy;
        if (author?.email) authorSample.set(author.email.toLowerCase(), author.name);
      }
    }

    try {
      const autoData = await pipefyGraphQL<{ automations: { edges: { node: { name: string; active: boolean; event_id: string; action_id: string } }[] } }>(
        `query($orgId: ID!, $repoId: ID) {
          automations(organizationId: $orgId, repoId: $repoId, first: 100) {
            edges { node { name active event_id action_id } }
          }
        }`,
        { orgId: PIPEFY_ORG_ID, repoId: pipe.id }
      );
      for (const edge of autoData.automations.edges) {
        automationTally.total += 1;
        const triggerOk = MAPPABLE_TRIGGERS[edge.node.event_id];
        const actionOk = MAPPABLE_ACTIONS[edge.node.action_id];
        if (triggerOk && actionOk) automationTally.mappable += 1;
        else automationTally.unmappable += 1;
      }
    } catch (err: any) {
      if (String(err.message).includes('PERMISSION_DENIED') || String(err.message).includes('Acesso negado')) {
        permissionDeniedPipes.push(pipe.name);
      } else {
        throw err;
      }
    }
  }

  console.log('=== Tipos de campo encontrados (todos os 16 pipes) ===');
  for (const [type, count] of [...fieldTypeTally.entries()].sort((a, b) => b[1] - a[1])) {
    const target = ['label_select', 'assignee_select', 'attachment', 'connector', 'statement'].includes(type)
      ? '(não vira campo, ver mapeamento nativo)'
      : mapFieldType(type);
    console.log(`  ${type} -> ${target}  (${count}x)`);
  }
  if (unknownFieldLabels.length > 0) {
    console.log(`\n${unknownFieldLabels.length} campo(s) com tipo desconhecido, caíram no fallback "text":`);
    for (const label of unknownFieldLabels.slice(0, 30)) console.log(`  - ${label}`);
  }

  console.log(`\n=== Autores (amostra, primeiros 20 cards por pipe) ===`);
  console.log(`${authorSample.size} autores distintos na amostra.`);

  console.log(`\n=== Automações ===`);
  console.log(`${automationTally.total} automações encontradas, ${automationTally.mappable} mapeáveis automaticamente, ${automationTally.unmappable} vão precisar de recriação manual.`);
  if (permissionDeniedPipes.length > 0) {
    console.log(`Pipes sem permissão pra ler automações: ${permissionDeniedPipes.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
