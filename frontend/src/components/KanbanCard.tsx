import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../types';
import Avatar from './Avatar';

function dueStatus(dueDate: string | null): 'overdue' | 'soon' | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'soon';
  return null;
}

function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-');
  return `${day}/${month}/${year}`;
}

function isSlaBreached(currentPhaseSince: string, slaHours: number | null): boolean {
  if (!slaHours) return false;
  const elapsedMs = Date.now() - new Date(currentPhaseSince).getTime();
  return elapsedMs > slaHours * 60 * 60 * 1000;
}

const MAX_AVATARS = 3;

export default function KanbanCard({
  card,
  slaHours,
  onClick,
}: {
  card: Card;
  slaHours: number | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const status = dueStatus(card.due_date);
  const slaBreached = isSlaBreached(card.current_phase_since, slaHours);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`kanban-card ${slaBreached ? 'kanban-card-sla-breached' : ''}`}
      onClick={onClick}
    >
      {card.labels.length > 0 && (
        <div className="kanban-card-labels">
          {card.labels.map((label) => (
            <span key={label.id} className="label-dot" style={{ background: label.color }} title={label.name} />
          ))}
        </div>
      )}
      <p className="kanban-card-title">
        <span className="card-number">#{card.id}</span> {card.title}
      </p>
      <div className="kanban-card-footer">
        {slaBreached && (
          <span className="kanban-card-due kanban-card-due-overdue" title="Tempo na fase acima do SLA">
            ⏱ SLA
          </span>
        )}
        {card.due_date && (
          <span
            className={`kanban-card-due ${status === 'overdue' ? 'kanban-card-due-overdue' : ''} ${
              status === 'soon' ? 'kanban-card-due-soon' : ''
            }`}
          >
            {status === 'overdue' && '⚠ '}
            {formatDueDate(card.due_date)}
          </span>
        )}
        {card.checklistSummary.total > 0 && (
          <span className="kanban-card-checklist muted">
            ☑ {card.checklistSummary.done}/{card.checklistSummary.total}
          </span>
        )}
        <span className="spacer" />
        {card.assignees.length > 0 && (
          <div className="avatar-stack">
            {card.assignees.slice(0, MAX_AVATARS).map((a) => (
              <Avatar key={a.user_id} name={a.name} size={20} />
            ))}
            {card.assignees.length > MAX_AVATARS && (
              <span className="avatar-overflow">+{card.assignees.length - MAX_AVATARS}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
