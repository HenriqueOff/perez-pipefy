import { PipelineConnectionModel } from '../models/pipelineConnection.model';
import { PipelineModel } from '../models/pipeline.model';
import { AppError } from '../utils/AppError';

export const PipelineConnectionService = {
  async listByPipeline(pipelineId: number) {
    const [asOwner, asTarget] = await Promise.all([
      PipelineConnectionModel.listByOwnerPipeline(pipelineId),
      PipelineConnectionModel.listByTargetPipeline(pipelineId),
    ]);
    return { asOwner, asTarget };
  },

  async create(ownerPipelineId: number, input: { target_pipeline_id: number; name: string }) {
    const targetPipeline = await PipelineModel.findById(input.target_pipeline_id);
    if (!targetPipeline) {
      throw AppError.notFound('Pipeline alvo não encontrado');
    }
    return PipelineConnectionModel.create({
      owner_pipeline_id: ownerPipelineId,
      target_pipeline_id: input.target_pipeline_id,
      name: input.name,
    });
  },

  async delete(connectionId: number) {
    const connection = await PipelineConnectionModel.findById(connectionId);
    if (!connection) {
      throw AppError.notFound('Conexão não encontrada');
    }
    return PipelineConnectionModel.delete(connectionId);
  },
};
