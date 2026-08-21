import { db } from '../config/db';
import { PipelineConnectionRow } from '../types/entities';

const TABLE = 'pipeline_connections';

export const PipelineConnectionModel = {
  findById(id: number) {
    return db<PipelineConnectionRow>(TABLE).where({ id }).first();
  },

  listByOwnerPipeline(pipelineId: number) {
    return db<PipelineConnectionRow>(TABLE).where({ owner_pipeline_id: pipelineId }).orderBy('name');
  },

  listByTargetPipeline(pipelineId: number) {
    return db<PipelineConnectionRow>(TABLE).where({ target_pipeline_id: pipelineId }).orderBy('name');
  },

  create(input: { owner_pipeline_id: number; target_pipeline_id: number; name: string }) {
    return db<PipelineConnectionRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<PipelineConnectionRow>(TABLE).where({ id }).delete();
  },
};
