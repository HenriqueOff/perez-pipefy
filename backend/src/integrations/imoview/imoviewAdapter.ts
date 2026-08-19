import { ImoviewEntityType, ImoviewRawEntity } from './types';

export interface CardSeed {
  title: string;
  fields: Record<string, unknown>;
}

/**
 * Único ponto do sistema que "conhece" o formato de dados do Imoview.
 * Nenhuma outra parte do domínio (services, controllers) deve importar
 * campos específicos do Imoview diretamente - tudo passa por aqui.
 *
 * O mapeamento de campos abaixo é um placeholder razoável (título +
 * despejo dos campos originais como custom fields de texto) até
 * confirmarmos o schema real de cada entidade com a documentação do Imoview.
 */
export function toCardSeed(entityType: ImoviewEntityType, raw: ImoviewRawEntity): CardSeed {
  const title = pickTitle(entityType, raw);
  const fields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'id') continue;
    fields[key] = typeof value === 'object' ? JSON.stringify(value) : value;
  }

  return { title, fields };
}

function pickTitle(entityType: ImoviewEntityType, raw: ImoviewRawEntity): string {
  const candidate = raw.nome ?? raw.titulo ?? raw.name ?? raw.title;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return `${entityType} #${raw.id}`;
}
