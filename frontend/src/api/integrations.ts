import { api } from './client';
import { ImoviewConfig } from '../types';

export const IntegrationsApi = {
  getImoviewConfig: () => api.get<ImoviewConfig>('/integrations/imoview/config').then((r) => r.data),

  upsertImoviewConfig: (input: { base_url: string; api_key: string }) =>
    api.put<ImoviewConfig>('/integrations/imoview/config', input).then((r) => r.data),
};
