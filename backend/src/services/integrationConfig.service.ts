import { IntegrationConfigModel } from '../models/integrationConfig.model';
import { encrypt } from '../utils/crypto';
import { AppError } from '../utils/AppError';

export const IntegrationConfigService = {
  async getImoviewConfig() {
    const config = await IntegrationConfigModel.findByProvider('imoview');
    if (!config) {
      return null;
    }
    // nunca retorna a credencial em texto claro para o cliente
    const { credentials_encrypted, ...safe } = config;
    void credentials_encrypted;
    return safe;
  },

  async upsertImoviewConfig(input: { base_url: string; api_key: string; config?: Record<string, unknown> }, userId: number) {
    if (!input.api_key) {
      throw new AppError('api_key é obrigatória', 422);
    }
    return IntegrationConfigModel.upsert({
      provider: 'imoview',
      base_url: input.base_url,
      credentials_encrypted: encrypt(input.api_key),
      config: input.config ?? null,
      created_by: userId,
    });
  },
};
