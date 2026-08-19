/**
 * Formato exato ainda não confirmado com a documentação do Imoview.
 * Mantido genérico de propósito: o adapter é o único lugar que precisa mudar
 * quando os endpoints reais forem confirmados.
 */
export interface ImoviewRawEntity {
  id: string | number;
  [key: string]: unknown;
}

export interface ImoviewCredentials {
  apiKey: string;
}

export type ImoviewEntityType = 'lead' | 'imovel' | 'contrato';
