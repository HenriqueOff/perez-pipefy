/** Filtros salvos por usuário/navegador — não é dado de negócio compartilhado entre
 * pessoas, então localStorage é suficiente (sem precisar de tabela/endpoint no backend). */
export interface SavedFilter<T> {
  name: string;
  value: T;
}

function read<T>(storageKey: string): SavedFilter<T>[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write<T>(storageKey: string, filters: SavedFilter<T>[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(filters));
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — filtro salvo só não persiste.
  }
}

export function listSavedFilters<T>(storageKey: string): SavedFilter<T>[] {
  return read<T>(storageKey);
}

export function saveFilter<T>(storageKey: string, name: string, value: T): SavedFilter<T>[] {
  const existing = read<T>(storageKey).filter((f) => f.name !== name);
  const next = [...existing, { name, value }];
  write(storageKey, next);
  return next;
}

export function deleteFilter<T>(storageKey: string, name: string): SavedFilter<T>[] {
  const next = read<T>(storageKey).filter((f) => f.name !== name);
  write(storageKey, next);
  return next;
}
