import { CardConnectionModel, ConnectedCardRow } from '../models/cardConnection.model';
import { CardModel } from '../models/card.model';
import { PipelineConnectionModel } from '../models/pipelineConnection.model';
import { AppError } from '../utils/AppError';
import { assertCardInPipeline } from '../utils/assertOwnership';

function groupByConnection(rows: ConnectedCardRow[]): Map<number, ConnectedCardRow[]> {
  const map = new Map<number, ConnectedCardRow[]>();
  for (const row of rows) {
    const list = map.get(row.pipeline_connection_id) ?? [];
    list.push(row);
    map.set(row.pipeline_connection_id, list);
  }
  return map;
}

export const CardConnectionService = {
  async listForCard(cardId: number, pipelineId: number) {
    const card = await assertCardInPipeline(cardId, pipelineId);

    const [ownerConnections, targetConnections, ownerCards, targetCards] = await Promise.all([
      PipelineConnectionModel.listByOwnerPipeline(card.pipeline_id),
      PipelineConnectionModel.listByTargetPipeline(card.pipeline_id),
      CardConnectionModel.listHydratedByOwner(cardId),
      CardConnectionModel.listHydratedByTarget(cardId),
    ]);

    const ownerCardsByConnection = groupByConnection(ownerCards);
    const targetCardsByConnection = groupByConnection(targetCards);

    return {
      asOwner: ownerConnections.map((connection) => ({
        connection,
        cards: ownerCardsByConnection.get(connection.id) ?? [],
      })),
      asTarget: targetConnections.map((connection) => ({
        connection,
        cards: targetCardsByConnection.get(connection.id) ?? [],
      })),
    };
  },

  async attach(
    cardId: number,
    pipelineId: number,
    input: { pipeline_connection_id: number; from_side: 'owner' | 'target'; other_card_id: number }
  ) {
    const card = await assertCardInPipeline(cardId, pipelineId);
    const connection = await PipelineConnectionModel.findById(input.pipeline_connection_id);
    if (!connection) {
      throw AppError.notFound('Conexão não encontrada');
    }

    const expectedPipelineId = input.from_side === 'owner' ? connection.owner_pipeline_id : connection.target_pipeline_id;
    if (card.pipeline_id !== expectedPipelineId) {
      throw new AppError('Esse card não pertence ao lado indicado desta conexão', 422);
    }

    if (input.other_card_id === cardId) {
      throw new AppError('Um card não pode se conectar a si mesmo', 422);
    }
    const otherCard = await CardModel.findById(input.other_card_id);
    const otherExpectedPipelineId = input.from_side === 'owner' ? connection.target_pipeline_id : connection.owner_pipeline_id;
    if (!otherCard || otherCard.pipeline_id !== otherExpectedPipelineId) {
      throw new AppError('O card selecionado não pertence à pipeline esperada desta conexão', 422);
    }

    const ownerCardId = input.from_side === 'owner' ? cardId : input.other_card_id;
    const targetCardId = input.from_side === 'owner' ? input.other_card_id : cardId;

    const existing = await CardConnectionModel.findOne(connection.id, ownerCardId, targetCardId);
    if (existing) {
      throw AppError.conflict('Esses cards já estão conectados');
    }

    return CardConnectionModel.create({
      pipeline_connection_id: connection.id,
      owner_card_id: ownerCardId,
      target_card_id: targetCardId,
    });
  },

  async detach(cardConnectionId: number, cardId: number, pipelineId: number) {
    await assertCardInPipeline(cardId, pipelineId);
    const cardConnection = await CardConnectionModel.findById(cardConnectionId);
    if (!cardConnection || (cardConnection.owner_card_id !== cardId && cardConnection.target_card_id !== cardId)) {
      throw AppError.notFound('Conexão de card não encontrada');
    }
    return CardConnectionModel.delete(cardConnectionId);
  },
};
