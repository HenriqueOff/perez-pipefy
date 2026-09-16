import { useRef, useState } from 'react';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

/** Dropdown de seleção múltipla (lógica "ou" entre as opções marcadas), pro filtro de
 * etiqueta/responsável do board — o Pipefy deixa marcar mais de uma etiqueta ou mais de
 * um responsável no mesmo filtro, e o <select> nativo só permitia uma opção por vez. */
export default function MultiSelectFilter({
  label,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  options: { id: number; name: string }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(containerRef, () => setOpen(false));

  const selectedNames = options.filter((o) => selectedIds.includes(o.id)).map((o) => o.name);
  const summary =
    selectedNames.length === 0
      ? label
      : selectedNames.length === 1
        ? selectedNames[0]
        : `${label} (${selectedNames.length})`;

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  return (
    <div className="multiselect-filter" ref={containerRef}>
      <button
        type="button"
        className={`secondary-button ${selectedIds.length > 0 ? 'multiselect-filter-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        {summary}
      </button>
      {open && (
        <div className="multiselect-filter-panel">
          {options.length === 0 && <p className="muted">Nada disponível</p>}
          {options.map((opt) => (
            <label key={opt.id} className="checkbox-label multiselect-filter-option">
              <input type="checkbox" checked={selectedIds.includes(opt.id)} onChange={() => toggle(opt.id)} />
              {opt.name}
            </label>
          ))}
          {selectedIds.length > 0 && (
            <button type="button" className="link-button multiselect-filter-clear" onClick={() => onChange([])}>
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
