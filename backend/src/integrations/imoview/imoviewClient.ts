import axios, { AxiosInstance } from 'axios';
import { ImoviewCredentials, ImoviewEntityType, ImoviewRawEntity } from './types';

/**
 * Cliente HTTP puro para a API do Imoview. Não conhece o domínio interno
 * (Pipeline/Card) - só sabe falar com a API externa. Ajustar os paths dos
 * endpoints e o esquema de autenticação assim que a documentação real do
 * Imoview for confirmada; hoje assume um header de API key simples.
 */
export class ImoviewClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, credentials: ImoviewCredentials) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 15_000,
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
    });
  }

  async fetchEntity(entityType: ImoviewEntityType, externalId: string): Promise<ImoviewRawEntity> {
    const { data } = await this.http.get<ImoviewRawEntity>(`/${entityType}/${externalId}`);
    return data;
  }

  async listChangedSince(entityType: ImoviewEntityType, since: Date): Promise<ImoviewRawEntity[]> {
    const { data } = await this.http.get<ImoviewRawEntity[]>(`/${entityType}`, {
      params: { updatedSince: since.toISOString() },
    });
    return data;
  }
}
