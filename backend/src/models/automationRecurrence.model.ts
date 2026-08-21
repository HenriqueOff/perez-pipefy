import { db } from '../config/db';
import { AutomationRecurrenceRow } from '../types/entities';

const TABLE = 'automation_recurrences';

export const AutomationRecurrenceModel = {
  findOne(automationId: number, cardId: number) {
    return db<AutomationRecurrenceRow>(TABLE).where({ automation_id: automationId, card_id: cardId }).first();
  },

  markFired(automationId: number, cardId: number, firedAt: Date) {
    return db<AutomationRecurrenceRow>(TABLE)
      .insert({ automation_id: automationId, card_id: cardId, last_fired_at: firedAt })
      .onConflict(['automation_id', 'card_id'])
      .merge({ last_fired_at: firedAt });
  },
};
