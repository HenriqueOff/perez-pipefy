import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PipelinesApi } from '../api/pipelines';
import Icon from './Icon';

interface Props {
  targetPipelineId: number;
  excludeCardIds: number[];
  onAttach: (cardId: number) => void;
  onClose: () => void;
}

export default function AttachCardModal({ targetPipelineId, excludeCardIds, onAttach, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search-connectable', targetPipelineId, debounced],
    queryFn: () => PipelinesApi.searchConnectableCards(targetPipelineId, debounced, excludeCardIds),
    enabled: debounced.trim().length >= 2,
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Anexar card</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          <label className="field-input">
            Buscar por título
            <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Digite ao menos 2 letras" />
          </label>

          {isFetching && <p className="muted">Buscando...</p>}

          <ul className="automation-list">
            {results?.map((r) => (
              <li key={r.card_id} className="automation-row">
                <div className="automation-info">
                  <span className="member-name">{r.title}</span>
                  <span className="muted">{r.phase_name}</span>
                </div>
                <button type="button" className="secondary-button" onClick={() => onAttach(r.card_id)}>
                  Anexar
                </button>
              </li>
            ))}
            {debounced.trim().length >= 2 && !isFetching && results?.length === 0 && (
              <p className="muted">Nenhum card encontrado.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
