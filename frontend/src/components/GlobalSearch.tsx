import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchApi, SearchResult } from '../api/search';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      SearchApi.search(query.trim())
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useOnClickOutside(containerRef, () => setOpen(false));

  function goTo(result: SearchResult) {
    setOpen(false);
    setQuery('');
    navigate(`/pipelines/${result.pipeline_id}?card=${result.card_id}`);
  }

  return (
    <div className="global-search" ref={containerRef}>
      <input
        type="search"
        placeholder="Buscar cards..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="global-search-results">
          {loading && <div className="global-search-empty">Buscando...</div>}
          {!loading && results.length === 0 && <div className="global-search-empty">Nenhum resultado</div>}
          {!loading &&
            results.map((r) => (
              <button key={r.card_id} type="button" className="global-search-result" onClick={() => goTo(r)}>
                <span className="global-search-result-title">{r.title}</span>
                <span className="muted">
                  {r.pipeline_name} · {r.phase_name}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
