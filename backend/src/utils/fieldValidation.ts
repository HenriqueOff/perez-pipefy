import { AppError } from './AppError';

// Estrutura mínima compartilhada por CustomFieldRow (campo de fase de pipeline) e
// DatabaseFieldRow (campo de database) — ambos reaproveitam esta mesma validação.
export interface FieldLike {
  id: number;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
}

export function validateFieldValue(field: FieldLike, value: unknown): void {
  if (value === null || value === undefined || value === '') {
    if (field.required) {
      throw new AppError(`O campo "${field.label}" é obrigatório`, 422);
    }
    return;
  }

  switch (field.type) {
    case 'text':
    case 'textarea':
      if (typeof value !== 'string') {
        throw new AppError(`O campo "${field.label}" deve ser texto`, 422);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new AppError(`O campo "${field.label}" deve ser numérico`, 422);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new AppError(`O campo "${field.label}" deve ser verdadeiro/falso`, 422);
      }
      break;
    case 'date':
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw new AppError(`O campo "${field.label}" deve ser uma data válida`, 422);
      }
      break;
    case 'select': {
      const options = (field.options ?? []) as string[];
      if (typeof value !== 'string' || !options.includes(value)) {
        throw new AppError(`O campo "${field.label}" deve ser uma das opções válidas`, 422);
      }
      break;
    }
    case 'formula':
      throw new AppError(`O campo "${field.label}" é calculado automaticamente e não pode ser preenchido diretamente`, 422);
  }
}

export function requiredFieldsMissing<T extends FieldLike>(fields: T[], values: Map<number, unknown>): T[] {
  return fields.filter((field) => {
    if (!field.required) return false;
    const value = values.get(field.id);
    return value === null || value === undefined || value === '';
  });
}
