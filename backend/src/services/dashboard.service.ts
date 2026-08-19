import { PhaseModel } from '../models/phase.model';
import { CardModel } from '../models/card.model';
import { CardAssigneeModel } from '../models/cardAssignee.model';
import { CardHistoryModel } from '../models/cardHistory.model';

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
      if (!phase?.sla_hours) return false;
      return now - new Date(c.current_phase_since).getTime() > phase.sla_hours * 3600000;
    }).length;

    const assigneesByCard = new Map<number, { user_id: number; name: string }[]>();
    for (const row of assigneeRows) {
      const list = assigneesByCard.get(row.card_id) ?? [];
      list.push({ user_id: row.user_id, name: row.name });
      assigneesByCard.set(row.card_id, list);
    }

    const countByAssignee = new Map<string, { user_id: number | null; name: string; count: number }>();
    for (const card of cards) {
      const assignees = assigneesByCard.get(card.id) ?? [];
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
    const cardsByAssignee = Array.from(countByAssignee.values()).sort((a, b) => b.count - a.count);

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
};
