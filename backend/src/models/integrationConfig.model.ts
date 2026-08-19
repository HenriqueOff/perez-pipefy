import { db } from '../config/db';
import { IntegrationConfigRow } from '../types/entities';
import { IntegrationProvider } from '../types/enums';

const TABLE = 'integration_configs';

export const IntegrationConfigModel = {
  findByProvider(provider: IntegrationProvider) {
    return db<IntegrationConfigRow>(TABLE).where({ provider }).first();
  },

  upsert(input: {
    provider: IntegrationProvider;
    base_url: string;
    credentials_encrypted: string;
    config?: Record<string, unknown> | null;
    created_by: number;
  }) {
    const insertPayload = { ...input, config: input.config ? JSON.stringify(input.config) : null };
    return db<IntegrationConfigRow>(TABLE)
      .insert(insertPayload as unknown as IntegrationConfigRow)
      .onConflict(['provider'])
      .merge({
        base_url: input.base_url,
        credentials_encrypted: input.credentials_encrypted,
        config: (input.config ? JSON.stringify(input.config) : null) as unknown as Record<string, unknown> | null,
        updated_at: db.fn.now(),
      })
      .returning('*')
      .then((rows) => rows[0]);
  },
};
