import axios from 'axios';
import { PublicFormSchema } from '../types';
import { API_BASE_URL } from './config';

// Cliente isolado do client.ts autenticado: esta página é acessada por
// visitantes sem sessão, então não deve herdar tokens/redirects de login.
const publicApi = axios.create({ baseURL: `${API_BASE_URL}/public/forms` });

export const PublicFormApi = {
  getSchema: (token: string) => publicApi.get<PublicFormSchema>(`/${token}`).then((r) => r.data),

  submit: (token: string, input: { title: string; fields?: Record<string, unknown> }) =>
    publicApi.post<{ id: number }>(`/${token}/submit`, input).then((r) => r.data),
};
