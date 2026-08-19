import { api } from './client';

export interface SearchResult {
  card_id: number;
  title: string;
  pipeline_id: number;
  pipeline_name: string;
  phase_name: string;
}

export const SearchApi = {
  search: (query: string) => api.get<SearchResult[]>('/search', { params: { q: query } }).then((r) => r.data),
};
