import { useState } from 'react';
import { Label, Phase, PipelineMember } from '../types';
import { CardFilters, EMPTY_CARD_FILTERS, hasActiveCardFilters } from '../utils/cardFilters';
import { listSavedFilters, saveFilter, deleteFilter } from '../utils/savedFilters';

export default function CardFilterBar({
  storageKey,
  filters,
  onChange,
  labels,
  members,
  phases,
  onExportCsv,
  exportDisabled,
}: {
  storageKey: string;
  filters: CardFilters;
  onChange: (filters: CardFilters) => void;
  labels: Label[] | undefined;
  members: PipelineMember[];
  /** Só passe quando a tela já separa cards por fase (kanban) — nesse caso o filtro de
   * fase é redundante e fica de fora. A tabela passa as fases e mostra o seletor. */
  phases?: Phase[];
  onExportCsv?: () => void;
  exportDisabled?: boolean;
}) {
  const [savingFilterName, setSavingFilterName] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState(() => listSavedFilters<CardFilters>(storageKey));

  const active = hasActiveCardFilters(filters);

  function applySavedFilter(name: string) {
    const found = savedFilters.find((f) => f.name === name);
    if (found) onChange(found.value);
  }

  function handleSaveFilter() {
    if (!savingFilterName?.trim()) return;
    setSavedFilters(saveFilter(storageKey, savingFilterName.trim(), filters));
    setSavingFilterName(null);
  }

  function handleDeleteSavedFilter(name: string) {
    setSavedFilters(deleteFilter(storageKey, name));
  }

  return (
    <>
      <div className="table-filters-bar">
        <input
          type="search"
          placeholder="Buscar no título ou nos campos..."
          value={filters.text}
          onChange={(e) => onChange({ ...filters, text: e.target.value })}
          className="card-filter-text"
        />
        {phases && (
          <select
            value={filters.phaseId}
            onChange={(e) => onChange({ ...filters, phaseId: e.target.value ? Number(e.target.value) : '' })}
          >
            <option value="">Todas as fases</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select value={filters.labelId} onChange={(e) => onChange({ ...filters, labelId: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">Todas as etiquetas</option>
          {labels?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={filters.assigneeId}
          onChange={(e) => onChange({ ...filters, assigneeId: e.target.value ? Number(e.target.value) : '' })}
        >
          <option value="">Todos os responsáveis</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.overdueOnly}
            onChange={(e) => onChange({ ...filters, overdueOnly: e.target.checked })}
          />
          Só atrasados
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.slaBreachedOnly}
            onChange={(e) => onChange({ ...filters, slaBreachedOnly: e.target.checked })}
          />
          Só com SLA estourado
        </label>

        {onExportCsv && (
          <button type="button" className="secondary-button" onClick={onExportCsv} disabled={exportDisabled}>
            Exportar CSV
          </button>
        )}

        {active && (
          <button type="button" className="secondary-button" onClick={() => onChange(EMPTY_CARD_FILTERS)}>
            Limpar filtros
          </button>
        )}

        {active &&
          (savingFilterName === null ? (
            <button type="button" className="link-button" onClick={() => setSavingFilterName('')}>
              Salvar filtro...
            </button>
          ) : (
            <span className="table-filters-save">
              <input
                autoFocus
                placeholder="Nome do filtro"
                value={savingFilterName}
                onChange={(e) => setSavingFilterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
              />
              <button type="button" onClick={handleSaveFilter} disabled={!savingFilterName.trim()}>
                Salvar
              </button>
              <button type="button" className="secondary-button" onClick={() => setSavingFilterName(null)}>
                Cancelar
              </button>
            </span>
          ))}
      </div>

      {savedFilters.length > 0 && (
        <div className="table-filters-chips">
          <span className="muted">Filtros salvos:</span>
          {savedFilters.map((f) => (
            <span key={f.name} className="assignee-chip">
              <button type="button" className="link-button" onClick={() => applySavedFilter(f.name)}>
                {f.name}
              </button>
              <button
                type="button"
                className="assignee-chip-remove"
                title="Excluir filtro salvo"
                onClick={() => handleDeleteSavedFilter(f.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
