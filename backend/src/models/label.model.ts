import { db } from '../config/db';
import { LabelRow } from '../types/entities';

const TABLE = 'labels';

export const LabelModel = {
  listByPipeline(pipelineId: number) {
    return db<LabelRow>(TABLE).where({ pipeline_id: pipelineId }).orderBy('name');
  },

  findById(id: number) {
    return db<LabelRow>(TABLE).where({ id }).first();
  },

  create(input: { pipeline_id: number; name: string; color?: string }) {
    return db<LabelRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<LabelRow, 'name' | 'color'>>) {
    return db<LabelRow>(TABLE)
      .where({ id })
      .update(changes)
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<LabelRow>(TABLE).where({ id }).delete();
  },

  listByCard(cardId: number) {
    return db<LabelRow>('card_labels')
      .join('labels', 'labels.id', 'card_labels.label_id')
      .where({ card_id: cardId })
      .select('labels.*')
      .orderBy('labels.name');
  },

  listByPipelineCards(pipelineId: number) {
    return db('card_labels')
      .join('labels', 'labels.id', 'card_labels.label_id')
      .join('cards', 'cards.id', 'card_labels.card_id')
      .where('cards.pipeline_id', pipelineId)
      .select('card_labels.card_id', 'labels.id', 'labels.name', 'labels.color') as Promise<
      { card_id: number; id: number; name: string; color: string }[]
    >;
  },

  attachToCard(cardId: number, labelId: number) {
    return db('card_labels').insert({ card_id: cardId, label_id: labelId }).onConflict(['card_id', 'label_id']).ignore();
  },

  detachFromCard(cardId: number, labelId: number) {
    return db('card_labels').where({ card_id: cardId, label_id: labelId }).delete();
  },
};
