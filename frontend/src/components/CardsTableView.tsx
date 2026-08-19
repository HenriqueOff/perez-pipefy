import { Card, Phase, PipelineMember } from '../types';
import Avatar from './Avatar';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function CardsTableView({
  cards,
  phases,
  onCardClick,
}: {
  cards: Card[];
  phases: Phase[];
  members: PipelineMember[];
  onCardClick: (card: Card) => void;
}) {
  const phaseById = new Map(phases.map((p) => [p.id, p]));

  const sorted = [...cards].sort((a, b) => {
    const posA = phases.findIndex((p) => p.id === a.current_phase_id);
    const posB = phases.findIndex((p) => p.id === b.current_phase_id);
    return posA - posB || a.position - b.position;
  });

  return (
    <div className="admin-table-wrap">
      <table className="admin-table cards-table">
        <thead>
          <tr>
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
              <td colSpan={5} className="muted">
                Nenhum card neste pipeline ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
