import { db } from '../config/db';
import { ChecklistItemRow } from '../types/entities';

const TABLE = 'checklist_items';

export const ChecklistItemModel = {
  listByCard(cardId: number) {
    return db<ChecklistItemRow>(TABLE).where({ card_id: cardId }).orderBy('position');
  },

  findById(id: number) {
    return db<ChecklistItemRow>(TABLE).where({ id }).first();
  },

  create(input: { card_id: number; title: string; position: number }) {
    return db<ChecklistItemRow>(TABLE)
      .insert(input)
      .returning('*')
      .then((rows) => rows[0]);
  },

  update(id: number, changes: Partial<Pick<ChecklistItemRow, 'title' | 'done' | 'position'>>) {
    return db<ChecklistItemRow>(TABLE)
      .where({ id })
      .update(changes)
      .returning('*')
      .then((rows) => rows[0]);
  },

  delete(id: number) {
    return db<ChecklistItemRow>(TABLE).where({ id }).delete();
  },

  countsByPipelineCards(pipelineId: number) {
    return db(TABLE)
      .join('cards', 'cards.id', `${TABLE}.card_id`)
      .where('cards.pipeline_id', pipelineId)
      .groupBy(`${TABLE}.card_id`)
      .select(`${TABLE}.card_id`)
      .count('* as total')
      .sum({ done: db.raw('CASE WHEN done THEN 1 ELSE 0 END') }) as Promise<
      { card_id: number; total: string; done: string }[]
    >;
  },
};
