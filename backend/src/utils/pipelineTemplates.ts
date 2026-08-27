export interface PipelineTemplatePhase {
  name: string;
  color?: string;
}

export interface PipelineTemplate {
  label: string;
  phases: PipelineTemplatePhase[];
}

// Ponto único de definição — o endpoint de listagem e a criação do pipeline usam este
// mesmo dicionário, então adicionar um template aqui já cobre os dois.
export const PIPELINE_TEMPLATES: Record<string, PipelineTemplate> = {
  captacao_imoveis: {
    label: 'Captação de imóveis',
    phases: [
      { name: 'Captação', color: '#9CA3AF' },
      { name: 'Vistoria', color: '#60A5FA' },
      { name: 'Documentação', color: '#FBBF24' },
      { name: 'Publicado', color: '#34D399' },
    ],
  },
  locacao_residencial: {
    label: 'Locação residencial',
    phases: [
      { name: 'Interessados', color: '#9CA3AF' },
      { name: 'Visita agendada', color: '#60A5FA' },
      { name: 'Análise de documentos', color: '#FBBF24' },
      { name: 'Contrato', color: '#A78BFA' },
      { name: 'Locado', color: '#34D399' },
    ],
  },
  venda: {
    label: 'Venda',
    phases: [
      { name: 'Prospecção', color: '#9CA3AF' },
      { name: 'Proposta', color: '#60A5FA' },
      { name: 'Negociação', color: '#FBBF24' },
      { name: 'Fechamento', color: '#A78BFA' },
      { name: 'Vendido', color: '#34D399' },
    ],
  },
};

export type PipelineTemplateKey = keyof typeof PIPELINE_TEMPLATES;

export function listPipelineTemplates() {
  return Object.entries(PIPELINE_TEMPLATES).map(([key, template]) => ({ key, label: template.label }));
}
