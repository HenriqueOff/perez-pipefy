import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, Phase } from '../types';
import KanbanCard from './KanbanCard';
import Icon from './Icon';
import Tooltip from './Tooltip';
import { getContrastTextColor } from '../utils/color';

const DEFAULT_PHASE_COLOR = '#9CA3AF';

export default function KanbanColumn({
  phase,
  cards,
  totalCount,
  canEdit,
  canMoveLeft,
  canMoveRight,
  onCardClick,
  onSettingsClick,
  onMoveLeft,
  onMoveRight,
}: {
  phase: Phase;
  cards: Card[];
  /** Total de cards na fase sem filtro nenhum aplicado — usado só pro selo de limite de
   * WIP, pra um filtro ativo não fazer a fase parecer "dentro do limite" por engano. Sem
   * filtro ativo, é igual a cards.length. */
  totalCount?: number;
  canEdit: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onCardClick: (card: Card) => void;
  onSettingsClick: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase.id, data: { phase } });
  const storageKey = `phase-collapsed-${phase.id}`;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(storageKey) === '1');

  useEffect(() => {
    localStorage.setItem(storageKey, collapsed ? '1' : '0');
  }, [collapsed, storageKey]);

  const realCount = totalCount ?? cards.length;
  const isFiltered = realCount !== cards.length;
  const overLimit = phase.wip_limit != null && realCount > phase.wip_limit;
  const pillColor = phase.color ?? DEFAULT_PHASE_COLOR;
  const pillTextColor = getContrastTextColor(pillColor);

  if (collapsed) {
    return (
      <div className="kanban-column kanban-column-collapsed">
        <button
          type="button"
          className="icon-button icon-button-small kanban-column-expand"
          title="Expandir fase"
          onClick={() => setCollapsed(false)}
        >
          <Icon name="chevronRight" size={14} />
        </button>
        <span className="kanban-column-collapsed-label">{phase.name}</span>
        <span className="kanban-column-count">{cards.length}</span>
      </div>
    );
  }

  return (
    <div className={`kanban-column ${isOver ? 'kanban-column-over' : ''}`} ref={setNodeRef}>
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <button
            type="button"
            className="icon-button icon-button-small kanban-column-collapse"
            title="Colapsar fase"
            onClick={() => setCollapsed(true)}
          >
            <Icon name="chevronLeft" size={14} />
          </button>
          <span className="kanban-column-pill" style={{ background: pillColor, color: pillTextColor }}>
            {phase.is_final && <Icon name="check" size={12} />}
            {phase.name}
            {phase.wip_limit != null ? (
              <Tooltip label={overLimit ? `Limite de ${phase.wip_limit} cards excedido` : `Limite: ${phase.wip_limit} cards`}>
                <span className={`kanban-column-count ${overLimit ? 'kanban-column-count-over' : ''}`}>
                  {isFiltered ? `${cards.length} de ${realCount}` : `${realCount}/${phase.wip_limit}`}
                </span>
              </Tooltip>
            ) : (
              <span className="kanban-column-count">{isFiltered ? `${cards.length} de ${realCount}` : realCount}</span>
            )}
          </span>
        </div>
        {canEdit && (
          <div className="kanban-column-controls">
            <button
              type="button"
              className="icon-button icon-button-small"
              title="Mover fase para a esquerda"
              disabled={!canMoveLeft}
              onClick={onMoveLeft}
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            <button
              type="button"
              className="icon-button icon-button-small"
              title="Configurar fase"
              onClick={onSettingsClick}
            >
              <Icon name="gear" size={14} />
            </button>
            <button
              type="button"
              className="icon-button icon-button-small"
              title="Mover fase para a direita"
              disabled={!canMoveRight}
              onClick={onMoveRight}
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="kanban-column-body">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} phase={phase} onClick={() => onCardClick(card)} />
        ))}
      </div>
    </div>
  );
}
