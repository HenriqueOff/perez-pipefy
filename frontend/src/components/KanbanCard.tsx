import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, Phase } from '../types';
import Avatar from './Avatar';
import Icon from './Icon';
import { getContrastTextColor } from '../utils/color';

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

function relativeDueLabel(dueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  const [year, month, day] = dueDate.split('-');
  const formatted = `${day}/${month}/${year}`;
  if (diffDays === 0) return `${formatted} · hoje`;
  if (diffDays > 0) return `${formatted} · em ${diffDays}d`;
  return `${formatted} · há ${Math.abs(diffDays)}d`;
}

function isSlaBreached(currentPhaseSince: string, slaHours: number | null): boolean {
  if (!slaHours) return false;
  const elapsedMs = Date.now() - new Date(currentPhaseSince).getTime();
  return elapsedMs > slaHours * 60 * 60 * 1000;
}

const PREVIEWABLE_TYPES = new Set(['text', 'textarea', 'select', 'date', 'number']);

function pickPreviewFields(phase: Phase, card: Card): { label: string; value: string }[] {
  const fields = [...phase.customFields]
    .filter((f) => PREVIEWABLE_TYPES.has(f.type))
    .sort((a, b) => a.position - b.position);

  const preview: { label: string; value: string }[] = [];
  for (const field of fields) {
    if (preview.length >= 2) break;
    const match = card.fieldValues.find((fv) => fv.custom_field_id === field.id);
    const value = formatPreviewValue(match?.value);
    if (!value) continue;
    preview.push({ label: field.label, value });
  }
  return preview;
}

function formatPreviewValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = Array.isArray(value) ? value.join(', ') : String(value);
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

const MAX_AVATARS = 3;

export default function KanbanCard({ card, phase, onClick }: { card: Card; phase: Phase; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const status = dueStatus(card.due_date);
  const slaBreached = isSlaBreached(card.current_phase_since, phase.sla_hours);
  const previewFields = pickPreviewFields(phase, card);
  const [priorityLabel, ...otherLabels] = card.labels;

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
          {priorityLabel && (
            <span
              className="kanban-card-priority-pill"
              style={{ background: priorityLabel.color, color: getContrastTextColor(priorityLabel.color) }}
            >
              {priorityLabel.name}
            </span>
          )}
          {otherLabels.map((label) => (
            <span key={label.id} className="label-dot" style={{ background: label.color }} title={label.name} />
          ))}
        </div>
      )}

      <p className="kanban-card-title">
        <span className="card-number">#{card.id}</span> {card.title}
      </p>

      {status === 'overdue' && <span className="kanban-card-overdue-badge">⚠ Atrasado</span>}

      {previewFields.length > 0 && (
        <div className="kanban-card-preview">
          {previewFields.map((f) => (
            <div key={f.label} className="kanban-card-preview-row">
              <span className="kanban-card-preview-label">{f.label}</span>
              <span className="kanban-card-preview-value">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {card.assignees.length > 0 && (
        <div className="kanban-card-preview-row">
          <span className="kanban-card-preview-label">
            <Icon name="user" size={11} /> Responsável
          </span>
          <span className="kanban-card-preview-value">
            {card.assignees[0].name}
            {card.assignees.length > 1 ? ` +${card.assignees.length - 1}` : ''}
          </span>
        </div>
      )}

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
            <Icon name="calendar" size={11} /> {relativeDueLabel(card.due_date)}
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
