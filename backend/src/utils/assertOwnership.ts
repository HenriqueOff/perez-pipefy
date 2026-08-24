import { CardModel } from '../models/card.model';
import { CardRow } from '../types/entities';
import { AppError } from './AppError';

/**
 * Fecha a brecha de IDOR entre pipelines: requirePipelineRole só confere o papel do
 * usuário no :pipelineId da URL, nunca se o recurso aninhado (:cardId e o que pendura
 * nele — comentário, anexo, item de checklist, etc.) realmente pertence a esse pipeline.
 * Sem isso, quem é editor/manager em UM pipeline consegue ler/alterar cards de QUALQUER
 * outro só trocando o :cardId na URL. 404 (não 403) pra não confirmar a um atacante que
 * o card existe em outro pipeline.
 */
export async function assertCardInPipeline(cardId: number, pipelineId: number): Promise<CardRow> {
  const card = await CardModel.findById(cardId);
  if (!card || card.pipeline_id !== pipelineId) {
    throw AppError.notFound('Card não encontrado');
  }
  return card;
}
