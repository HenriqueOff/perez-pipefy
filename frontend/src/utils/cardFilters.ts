import { Card, Phase } from '../types';

export interface CardFilters {
  phaseId: number | '';
  labelId: number | '';
  assigneeId: number | '';
  overdueOnly: boolean;
  slaBreachedOnly: boolean;
  text: string;
}

export const EMPTY_CARD_FILTERS: CardFilters = {
  phaseId: '',
  labelId: '',
  assigneeId: '',
  overdueOnly: false,
  slaBreachedOnly: false,
  text: '',
};

export function hasActiveCardFilters(filters: CardFilters): boolean {
  return (
    filters.phaseId !== '' ||
    filters.labelId !== '' ||
    filters.assigneeId !== '' ||
    filters.overdueOnly ||
    filters.slaBreachedOnly ||
    filters.text.trim() !== ''
  );
}

export function isOverdue(card: Card): boolean {
  // Comparação de string YYYY-MM-DD já ordena igual a data — um card com vencimento
  // hoje não conta como atrasado, só a partir do dia seguinte.
  return !!card.due_date && card.due_date < new Date().toISOString().slice(0, 10);
}

// Mesma regra de backend/src/models/card.model.ts e dashboard.service.ts: override do
// card vence sobre o SLA da fase; sem nenhum dos dois definido, nunca estoura.
export function isSlaBreached(card: Card, phase: Phase | undefined): boolean {
  const effectiveSla = card.sla_override_hours ?? phase?.sla_hours ?? null;
  if (!effectiveSla) return false;
  const sinceMs = new Date(card.current_phase_since).getTime();
  return Date.now() - sinceMs > effectiveSla * 3600000;
}

function fieldValueMatchesText(value: unknown, text: string): boolean {
  if (value == null) return false;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase().includes(text);
  }
  return false;
}

export function matchesCardFilters(card: Card, filters: CardFilters, phaseById: Map<number, Phase>): boolean {
  if (filters.phaseId !== '' && card.current_phase_id !== filters.phaseId) return false;
  if (filters.labelId !== '' && !card.labels.some((l) => l.id === filters.labelId)) return false;
  if (filters.assigneeId !== '' && !card.assignees.some((a) => a.user_id === filters.assigneeId)) return false;
  if (filters.overdueOnly && !isOverdue(card)) return false;
  if (filters.slaBreachedOnly && !isSlaBreached(card, phaseById.get(card.current_phase_id))) return false;

  const text = filters.text.trim().toLowerCase();
  if (text) {
    const inTitle = card.title.toLowerCase().includes(text);
    const inFields = card.fieldValues.some((fv) => fieldValueMatchesText(fv.value, text));
    if (!inTitle && !inFields) return false;
  }

  return true;
}
