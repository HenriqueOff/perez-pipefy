import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchApi, SearchResult } from '../api/search';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { addRecentSearch, getRecentSearches } from '../utils/recentSearches';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      // Campo vazio: deixa o dropdown de "buscas recentes" aberto se já estava (não força
      // fechar); com 1 caractere só (nem vazio, nem busca de verdade), fecha.
      if (query.trim().length > 0) setOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const term = query.trim();
      SearchApi.search(term)
        .then((data) => {
          setResults(data);
          setOpen(true);
          if (data.length > 0) setRecentSearches(addRecentSearch(term));
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useOnClickOutside(containerRef, () => setOpen(false));

  function goTo(result: SearchResult) {
    setOpen(false);
    setQuery('');
    navigate(`/pipelines/${result.pipeline_id}?card=${result.card_id}`);
  }

  function pickRecent(term: string) {
    setQuery(term);
  }

  const showRecent = query.trim().length === 0 && recentSearches.length > 0;

  return (
    <div className="global-search" ref={containerRef}>
      <input
        type="search"
        placeholder="Buscar cards..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => (results.length > 0 || recentSearches.length > 0) && setOpen(true)}
      />
      {open && (
        <div className="global-search-results">
          {showRecent ? (
            <>
              <div className="global-search-recent-label">Buscas recentes</div>
              {recentSearches.map((term) => (
                <button key={term} type="button" className="global-search-result" onClick={() => pickRecent(term)}>
                  <span className="global-search-result-title">{term}</span>
                </button>
              ))}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
