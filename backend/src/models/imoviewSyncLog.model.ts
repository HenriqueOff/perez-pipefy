import { db } from '../config/db';
import { ImoviewSyncLogRow } from '../types/entities';
import { SyncDirection, SyncStatus } from '../types/enums';

const TABLE = 'imoview_sync_logs';

export const ImoviewSyncLogModel = {
  listByIntegration(integrationConfigId: number, limit = 50) {
    return db<ImoviewSyncLogRow>(TABLE)
      .where({ integration_config_id: integrationConfigId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  create(input: {
    integration_config_id: number;
    direction: SyncDirection;
    entity_type: string;
    external_id?: string | null;
    internal_id?: number | null;
    status: SyncStatus;
    payload?: Record<string, unknown> | null;
    error_message?: string | null;
  }) {
    const payload = { ...input, payload: input.payload ? JSON.stringify(input.payload) : null };
    return db<ImoviewSyncLogRow>(TABLE)
      .insert(payload as unknown as ImoviewSyncLogRow)
      .returning('*')
      .then((rows) => rows[0]);
  },
};
