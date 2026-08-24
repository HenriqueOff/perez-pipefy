import { CustomFieldType } from '../../src/types/enums';

/**
 * Campos desses tipos não viram custom_fields: o dado real vem de outro lugar na resposta
 * do card (labels/assignees/attachments) ou não tem dado nenhum (statement), ou é
 * reconstruído à parte (connector, ver importConnections.ts).
 */
const SKIPPED_TYPES = new Set(['label_select', 'assignee_select', 'attachment', 'connector', 'statement']);

const TYPE_MAP: Record<string, CustomFieldType> = {
  short_text: 'text',
  email: 'text',
  phone: 'text',
  cpf: 'text',
  cnpj: 'text',
  long_text: 'textarea',
  number: 'number',
  currency: 'number',
  date: 'date',
  due_date: 'date',
  datetime: 'date',
  radio_vertical: 'select',
  radio_horizontal: 'select',
  select: 'select',
  dropdown: 'select',
  checklist_vertical: 'textarea',
  checklist_horizontal: 'textarea',
};

export function isSkippedFieldType(pipefyType: string): boolean {
  return SKIPPED_TYPES.has(pipefyType);
}

export function isChecklistType(pipefyType: string): boolean {
  return pipefyType === 'checklist_vertical' || pipefyType === 'checklist_horizontal';
}

/** Fallback pra 'text' cobre qualquer tipo desconhecido/novo que o Pipefy tenha — nunca trava a importação. */
export function mapFieldType(pipefyType: string): CustomFieldType {
  return TYPE_MAP[pipefyType] ?? 'text';
}

export function isKnownFieldType(pipefyType: string): boolean {
  return pipefyType in TYPE_MAP;
}
