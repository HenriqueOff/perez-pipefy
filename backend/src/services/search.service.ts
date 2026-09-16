import { db } from '../config/db';
import { PipelineModel } from '../models/pipeline.model';

export const SearchService = {
  async searchCards(userId: number, isAdmin: boolean, query: string) {
    const term = query.trim();
    if (term.length < 2) return [];
    const like = `%${term}%`;

    let builder = db('cards')
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .join('phases', 'phases.id', 'cards.current_phase_id')
      .where('pipelines.archived', false)
      .andWhere((qb) => {
        qb.where('cards.title', 'ilike', like)
          // Só campos sem restrição de papel (min_view_role) entram na busca — mesma regra
          // usada no formulário público (publicForm.service.ts): qualquer restrição já
          // conta como "isso é interno", então nem a existência do card deve vazar por um
          // valor que a pessoa buscando não teria permissão de ver.
          .orWhereExists(function () {
            this.select(1)
              .from('card_field_values')
              .join('custom_fields', 'custom_fields.id', 'card_field_values.custom_field_id')
              .whereRaw('card_field_values.card_id = cards.id')
              .whereNull('custom_fields.min_view_role')
              .andWhereRaw(`card_field_values.value #>> '{}' ilike ?`, [like]);
          })
          .orWhereExists(function () {
            this.select(1).from('comments').whereRaw('comments.card_id = cards.id').andWhere('comments.body', 'ilike', like);
          });
      })
      .select(
        'cards.id as card_id',
        'cards.title',
        'cards.pipeline_id',
        'pipelines.name as pipeline_name',
        'phases.name as phase_name'
      )
      .orderBy('cards.updated_at', 'desc')
      .limit(20);

    if (!isAdmin) {
      const pipelines = await PipelineModel.listForUser(userId);
      const pipelineIds = pipelines.map((p) => p.id);
      if (pipelineIds.length === 0) return [];
      builder = builder.whereIn('cards.pipeline_id', pipelineIds);
    }

    return builder;
  },

  /**
   * Busca cards dentro de UMA pipeline específica, pra anexar como card conectado.
   * A checagem de acesso à pipeline já acontece na rota (requirePipelineRole('viewer')).
   */
  async searchCardsInPipeline(pipelineId: number, query: string, excludeCardIds: number[]) {
    const term = query.trim();
    if (term.length < 2) return [];

    let builder = db('cards')
      .join('phases', 'phases.id', 'cards.current_phase_id')
      .where('cards.pipeline_id', pipelineId)
      .andWhere('cards.title', 'ilike', `%${term}%`)
      .select('cards.id as card_id', 'cards.title', 'cards.pipeline_id', 'phases.name as phase_name')
      .orderBy('cards.updated_at', 'desc')
      .limit(20);

    if (excludeCardIds.length > 0) {
      builder = builder.whereNotIn('cards.id', excludeCardIds);
    }

    return builder;
  },
};
