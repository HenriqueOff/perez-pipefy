import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import { Card, Phase, PipelineMember } from '../types';
import Avatar from './Avatar';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function CardsTableView({
  pipelineId,
  cards,
  phases,
  canEdit,
  onCardClick,
}: {
  pipelineId: number;
  cards: Card[];
  phases: Phase[];
  members: PipelineMember[];
  canEdit: boolean;
  onCardClick: (card: Card) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);

  const { data: labels } = useQuery({
    queryKey: ['labels', pipelineId],
    queryFn: () => PipelinesApi.listLabels(pipelineId),
    enabled: selectedIds.size > 0,
  });

  const invalidateCards = () => queryClient.invalidateQueries({ queryKey: ['cards', pipelineId] });

  const bulkMoveMutation = useMutation({
    mutationFn: (phaseId: number) =>
      Promise.all([...selectedIds].map((cardId) => PipelinesApi.moveCard(pipelineId, cardId, phaseId))),
    onSuccess: () => {
      setBulkError(null);
      setSelectedIds(new Set());
      invalidateCards();
    },
    onError: () => setBulkError('Não foi possível mover todos os cards selecionados.'),
  });

  const bulkLabelMutation = useMutation({
    mutationFn: (labelId: number) =>
      Promise.all([...selectedIds].map((cardId) => PipelinesApi.attachLabel(pipelineId, cardId, labelId))),
    onSuccess: () => {
      setBulkError(null);
      setSelectedIds(new Set());
      invalidateCards();
    },
    onError: () => setBulkError('Não foi possível aplicar a etiqueta em todos os cards selecionados.'),
  });

  const bulkPending = bulkMoveMutation.isPending || bulkLabelMutation.isPending;

  const phaseById = new Map(phases.map((p) => [p.id, p]));

  const sorted = [...cards].sort((a, b) => {
    const posA = phases.findIndex((p) => p.id === a.current_phase_id);
    const posB = phases.findIndex((p) => p.id === b.current_phase_id);
    return posA - posB || a.position - b.position;
  });

  const allSelected = sorted.length > 0 && sorted.every((c) => selectedIds.has(c.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(sorted.map((c) => c.id)));
  }

  function toggleOne(cardId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  return (
    <>
      {canEdit && selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedIds.size} card{selectedIds.size === 1 ? '' : 's'} selecionado{selectedIds.size === 1 ? '' : 's'}</span>
          <select
            value=""
            disabled={bulkPending}
            onChange={(e) => e.target.value && bulkMoveMutation.mutate(Number(e.target.value))}
          >
            <option value="">Mover para fase...</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value=""
            disabled={bulkPending}
            onChange={(e) => e.target.value && bulkLabelMutation.mutate(Number(e.target.value))}
          >
            <option value="">Aplicar etiqueta...</option>
            {labels?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {bulkPending && <span className="button-spinner" aria-hidden="true" />}
          <button type="button" className="secondary-button" onClick={() => setSelectedIds(new Set())}>
            Cancelar seleção
          </button>
        </div>
      )}
      {bulkError && <p className="error">{bulkError}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table cards-table">
          <thead>
            <tr>
              {canEdit && (
                <th>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Selecionar todos" />
                </th>
              )}
              <th>Card</th>
              <th>Fase</th>
              <th>Etiquetas</th>
              <th>Responsável</th>
              <th>Prazo</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((card) => {
              const phase = phaseById.get(card.current_phase_id);
              return (
                <tr key={card.id} className="cards-table-row" onClick={() => onCardClick(card)}>
                  {canEdit && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(card.id)}
                        onChange={() => undefined}
                        onClick={(e) => toggleOne(card.id, e)}
                        aria-label={`Selecionar ${card.title}`}
                      />
                    </td>
                  )}
                  <td>{card.title}</td>
                  <td>
                    <span className="table-phase-chip" style={{ borderColor: phase?.color ?? '#6b7280' }}>
                      {phase?.name ?? '—'}
                    </span>
                  </td>
                  <td>
                    <div className="table-label-chips">
                      {card.labels.map((label) => (
                        <span key={label.id} className="label-chip label-chip-small" style={{ background: label.color }}>
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {card.assignees.length > 0 ? (
                      <div className="table-assignee-list">
                        {card.assignees.map((a) => (
                          <span key={a.user_id} className="table-assignee">
                            <Avatar name={a.name} size={20} />
                            {a.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="muted">{formatDate(card.due_date)}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="muted">
                  Nenhum card neste pipeline ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
