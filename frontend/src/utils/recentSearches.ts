const STORAGE_KEY = 'global-search-recent';
const MAX_ITEMS = 6;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return getRecentSearches();
  try {
    const next = [trimmed, ...getRecentSearches().filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(
      0,
      MAX_ITEMS
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getRecentSearches();
  }
}
