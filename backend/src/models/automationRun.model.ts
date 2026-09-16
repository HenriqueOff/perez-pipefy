import { db } from '../config/db';

const TABLE = 'automation_runs';

export interface AutomationRunRow {
  id: number;
  automation_id: number;
  card_id: number | null;
  status: 'success' | 'error';
  error_message: string | null;
  created_at: Date;
}

export const AutomationRunModel = {
  record(input: { automation_id: number; card_id: number | null; status: 'success' | 'error'; error_message?: string | null }) {
    return db<AutomationRunRow>(TABLE)
      .insert({ ...input, error_message: input.error_message ?? null })
      .returning('*')
      .then((rows) => rows[0]);
  },

  listByAutomation(automationId: number, limit = 50) {
    return db<AutomationRunRow>(TABLE)
      .where({ automation_id: automationId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  /** Últimas execuções de qualquer automação do pipeline, mais recente primeiro — usado
   * na aba "Histórico" do modal de automações (visão geral, sem entrar automação por
   * automação). */
  listByPipeline(pipelineId: number, limit = 50) {
    return db<AutomationRunRow & { automation_name: string; card_title: string | null }>(TABLE)
      .join('automations', 'automations.id', `${TABLE}.automation_id`)
      .leftJoin('cards', 'cards.id', `${TABLE}.card_id`)
      .where('automations.pipeline_id', pipelineId)
      .select(`${TABLE}.*`, 'automations.name as automation_name', 'cards.title as card_title')
      .orderBy(`${TABLE}.created_at`, 'desc')
      .limit(limit);
  },
};
