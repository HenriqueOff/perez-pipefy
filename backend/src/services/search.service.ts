import { db } from '../config/db';
import { PipelineModel } from '../models/pipeline.model';

export const SearchService = {
  async searchCards(userId: number, isAdmin: boolean, query: string) {
    const term = query.trim();
    if (term.length < 2) return [];

    let builder = db('cards')
      .join('pipelines', 'pipelines.id', 'cards.pipeline_id')
      .join('phases', 'phases.id', 'cards.current_phase_id')
      .where('pipelines.archived', false)
      .andWhere('cards.title', 'ilike', `%${term}%`)
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
      const pipelines = await PipelineModel.listForUser(userId, false);
      const pipelineIds = pipelines.map((p) => p.id);
      if (pipelineIds.length === 0) return [];
      builder = builder.whereIn('cards.pipeline_id', pipelineIds);
    }

    return builder;
  },
};
