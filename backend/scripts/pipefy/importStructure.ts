/**
 * Cria pipelines/phases/custom_fields a partir da estrutura de pipes do Pipefy.
 * Idempotente: cada entidade só é criada se ainda não existir uma com o pipefy_*_id
 * correspondente, então rodar de novo não duplica nada.
 * Uso: npx ts-node --transpile-only scripts/pipefy/importStructure.ts --pipes=123,456
 */
import crypto from 'node:crypto';
import { db } from '../../src/config/db';
import { PipelineModel } from '../../src/models/pipeline.model';
import { PhaseModel } from '../../src/models/phase.model';
import { CustomFieldModel } from '../../src/models/customField.model';
import { pipefyGraphQL, parseArgs, parsePipeIds } from './client';
import { isSkippedFieldType, mapFieldType } from './fieldMapping';

interface PipefyField {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean | null;
}

interface PipefyPipe {
  id: string;
  name: string;
  start_form_fields: PipefyField[];
  phases: { id: string; name: string; fields: PipefyField[] }[];
}

function sanitizeKey(pipefyFieldId: string): string {
  const base = pipefyFieldId
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (base.length <= 100) return base || 'campo';
  const hash = crypto.createHash('md5').update(pipefyFieldId).digest('hex').slice(0, 6);
  return `${base.slice(0, 90)}_${hash}`;
}

async function resolveCreatorUserId(): Promise<number> {
  const admin = await db('users').where({ global_role: 'admin' }).orderBy('id').first();
  if (!admin) throw new Error('Nenhum usuário admin encontrado pra atribuir como criador dos pipelines importados');
  return admin.id;
}

async function importFieldsForPhase(phaseId: number, pipefyPipeId: string, fields: PipefyField[]) {
  let position = 0;
  for (const field of fields) {
    if (isSkippedFieldType(field.type)) continue;

    const existing = await db('custom_fields').where({ pipefy_field_id: `${pipefyPipeId}:${field.id}` }).first();
    if (existing) {
      position += 1;
      continue;
    }

    const created = await CustomFieldModel.create({
      phase_id: phaseId,
      label: field.label.slice(0, 150) || field.id,
      key: sanitizeKey(field.id),
      type: mapFieldType(field.type),
      options: field.type === 'radio_vertical' || field.type === 'radio_horizontal' || field.type === 'select' || field.type === 'dropdown' ? field.options : null,
      required: field.required ?? false,
      position,
    });
    await db('custom_fields').where({ id: created.id }).update({ pipefy_field_id: `${pipefyPipeId}:${field.id}` });
    position += 1;
  }
}

async function importPipe(pipefyPipeId: string, creatorUserId: number) {
  const data = await pipefyGraphQL<{ pipe: PipefyPipe }>(
    `query($id: ID!) {
      pipe(id: $id) {
        id
        name
        start_form_fields { id label type options required }
        phases { id name fields { id label type options required } }
      }
    }`,
    { id: pipefyPipeId }
  );
  const pipe = data.pipe;

  let pipeline = await db('pipelines').where({ pipefy_pipe_id: pipe.id }).first();
  if (!pipeline) {
    const created = await PipelineModel.create({ name: pipe.name, created_by: creatorUserId });
    await PipelineModel.addMember(created.id, creatorUserId, 'owner');
    await db('pipelines').where({ id: created.id }).update({ pipefy_pipe_id: pipe.id });
    pipeline = await db('pipelines').where({ id: created.id }).first();
    console.log(`  pipeline criado: ${pipe.name} (id ${created.id})`);
  } else {
    console.log(`  pipeline já existia: ${pipe.name} (id ${pipeline.id})`);
  }

  // fase sintética pro formulário de abertura
  const startFormPipefyId = `${pipe.id}:start_form`;
  let startPhase = await db('phases').where({ pipefy_phase_id: startFormPipefyId }).first();
  if (!startPhase) {
    const created = await PhaseModel.create({
      pipeline_id: pipeline.id,
      name: 'Formulário de abertura',
      position: 0,
      is_initial: true,
      is_final: pipe.phases.length === 0,
    });
    await db('phases').where({ id: created.id }).update({ pipefy_phase_id: startFormPipefyId });
    startPhase = await db('phases').where({ id: created.id }).first();
  }
  await importFieldsForPhase(startPhase.id, pipe.id, pipe.start_form_fields);

  for (let i = 0; i < pipe.phases.length; i++) {
    const pfPhase = pipe.phases[i];
    const isFinal = i === pipe.phases.length - 1;
    let phase = await db('phases').where({ pipefy_phase_id: pfPhase.id }).first();
    if (!phase) {
      const created = await PhaseModel.create({
        pipeline_id: pipeline.id,
        name: pfPhase.name.slice(0, 150) || `Fase ${i + 1}`,
        position: i + 1,
        is_initial: false,
        is_final: isFinal,
      });
      await db('phases').where({ id: created.id }).update({ pipefy_phase_id: pfPhase.id });
      phase = await db('phases').where({ id: created.id }).first();
    }
    await importFieldsForPhase(phase.id, pipe.id, pfPhase.fields);
  }

  console.log(`  ${pipe.phases.length + 1} fases, estrutura ok.`);
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const pipesArg = flags.pipes;
  if (!pipesArg || typeof pipesArg !== 'string') {
    throw new Error('Uso: --pipes=<id1>,<id2>,...');
  }
  const pipeIds = parsePipeIds(pipesArg);

  const creatorUserId = await resolveCreatorUserId();

  for (let i = 0; i < pipeIds.length; i++) {
    console.log(`[${i + 1}/${pipeIds.length}] pipe ${pipeIds[i]}`);
    await importPipe(pipeIds[i], creatorUserId);
  }
}

main()
  .catch((err) => {
    console.error('ERRO:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
