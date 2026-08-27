import { PhaseModel } from '../models/phase.model';
import { CardModel } from '../models/card.model';
import { CardAssigneeModel } from '../models/cardAssignee.model';
import { CardHistoryModel } from '../models/cardHistory.model';

function buildCardsByAssignee(
  cardIds: number[],
  assigneeRows: { card_id: number; user_id: number; name: string }[]
) {
  const assigneesByCard = new Map<number, { user_id: number; name: string }[]>();
  for (const row of assigneeRows) {
    const list = assigneesByCard.get(row.card_id) ?? [];
    list.push({ user_id: row.user_id, name: row.name });
    assigneesByCard.set(row.card_id, list);
  }

  const countByAssignee = new Map<string, { user_id: number | null; name: string; count: number }>();
  for (const cardId of cardIds) {
    const assignees = assigneesByCard.get(cardId) ?? [];
    if (assignees.length === 0) {
      const entry = countByAssignee.get('unassigned') ?? { user_id: null, name: 'Sem responsável', count: 0 };
      entry.count += 1;
      countByAssignee.set('unassigned', entry);
    } else {
      for (const a of assignees) {
        const key = String(a.user_id);
        const entry = countByAssignee.get(key) ?? { user_id: a.user_id, name: a.name, count: 0 };
        entry.count += 1;
        countByAssignee.set(key, entry);
      }
    }
  }
  return Array.from(countByAssignee.values()).sort((a, b) => b.count - a.count);
}

export const DashboardService = {
  async getForPipeline(pipelineId: number) {
    const [phases, cards, assigneeRows, transitions] = await Promise.all([
      PhaseModel.listByPipeline(pipelineId),
      CardModel.listByPipeline(pipelineId),
      CardAssigneeModel.listByPipelineCards(pipelineId),
      CardHistoryModel.listPhaseTransitionsByPipeline(pipelineId),
    ]);

    const now = Date.now();
    const phaseById = new Map(phases.map((p) => [p.id, p]));

    const cardsByPhase = phases.map((phase) => ({
      phase_id: phase.id,
      phase_name: phase.name,
      color: phase.color,
      count: cards.filter((c) => c.current_phase_id === phase.id).length,
    }));

    const overdueCount = cards.filter(
      (c) => c.due_date && new Date(`${c.due_date}T00:00:00`).getTime() < now
    ).length;

    const slaBreachedCount = cards.filter((c) => {
      const phase = phaseById.get(c.current_phase_id);
      const effectiveSla = c.sla_override_hours ?? phase?.sla_hours;
      if (!effectiveSla) return false;
      return now - new Date(c.current_phase_since).getTime() > effectiveSla * 3600000;
    }).length;

    const cardsByAssignee = buildCardsByAssignee(cards.map((c) => c.id), assigneeRows);

    const perCard = new Map<number, { to_phase_id: number | null; created_at: Date }[]>();
    for (const t of transitions) {
      const list = perCard.get(t.card_id) ?? [];
      list.push({ to_phase_id: t.to_phase_id, created_at: t.created_at });
      perCard.set(t.card_id, list);
    }

    const durationsByPhase = new Map<number, number[]>();
    for (const events of perCard.values()) {
      for (let i = 0; i < events.length; i++) {
        const current = events[i];
        const next = events[i + 1];
        if (current.to_phase_id == null || !next) continue;
        const hours = (new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) / 3600000;
        const list = durationsByPhase.get(current.to_phase_id) ?? [];
        list.push(hours);
        durationsByPhase.set(current.to_phase_id, list);
      }
    }

    const avgTimeInPhase = phases.map((phase) => {
      const list = durationsByPhase.get(phase.id) ?? [];
      const avgHours = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : null;
      return { phase_id: phase.id, phase_name: phase.name, avg_hours: avgHours, sample_size: list.length };
    });

    return {
      totalCards: cards.length,
      cardsByPhase,
      overdueCount,
      slaBreachedCount,
      cardsByAssignee,
      avgTimeInPhase,
    };
  },

  // Visão executiva cruzando todas as pipelines que o usuário enxerga — "funil de
  // conversão" por fase não faz sentido aqui (cada pipeline tem fases diferentes), então
  // o cruzamento fica em cards/atrasados/SLA por pipeline + produtividade por responsável.
  async getForAllPipelines(pipelines: { id: number; name: string }[]) {
    const pipelineIds = pipelines.map((p) => p.id);
    if (pipelineIds.length === 0) {
      return { totalCards: 0, totalOverdue: 0, totalSlaBreached: 0, byPipeline: [], cardsByAssignee: [] };
    }

    const [stats, cardIds, assigneeRows] = await Promise.all([
      CardModel.aggregateStatsByPipelines(pipelineIds),
      CardModel.listIdsByPipelines(pipelineIds),
      CardAssigneeModel.listByPipelinesCards(pipelineIds),
    ]);

    const statsByPipeline = new Map(stats.map((s) => [s.pipeline_id, s]));
    const byPipeline = pipelines
      .map((p) => ({
        pipeline_id: p.id,
        pipeline_name: p.name,
        cardCount: statsByPipeline.get(p.id)?.total ?? 0,
        overdueCount: statsByPipeline.get(p.id)?.overdue ?? 0,
        slaBreachedCount: statsByPipeline.get(p.id)?.sla_breached ?? 0,
      }))
      .sort((a, b) => b.cardCount - a.cardCount);

    return {
      totalCards: byPipeline.reduce((sum, p) => sum + p.cardCount, 0),
      totalOverdue: byPipeline.reduce((sum, p) => sum + p.overdueCount, 0),
      totalSlaBreached: byPipeline.reduce((sum, p) => sum + p.slaBreachedCount, 0),
      byPipeline,
      cardsByAssignee: buildCardsByAssignee(cardIds, assigneeRows),
    };
  },
};
