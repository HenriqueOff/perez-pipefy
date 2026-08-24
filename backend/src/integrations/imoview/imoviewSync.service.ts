import { CardExternalRefModel } from '../../models/cardExternalRef.model';
import { ImoviewSyncLogModel } from '../../models/imoviewSyncLog.model';
import { IntegrationConfigModel } from '../../models/integrationConfig.model';
import { CardService } from '../../services/card.service';
import { AppError } from '../../utils/AppError';
import { decrypt } from '../../utils/crypto';
import { resolveActorRole, roleAtLeast } from '../../utils/pipelineRole';
import { ImoviewClient } from './imoviewClient';
import { toCardSeed } from './imoviewAdapter';
import { ImoviewEntityType } from './types';

/**
 * MVP: sincronização disparada manualmente pelo usuário (sem polling/webhook).
 * Toda tentativa é registrada em imoview_sync_logs para depuração, já que os
 * endpoints reais do Imoview ainda não foram confirmados em produção.
 */
export const ImoviewSyncService = {
  async importCardFromImoview(input: {
    entityType: ImoviewEntityType;
    externalId: string;
    pipelineId: number;
    phaseId?: number;
    userId: number;
  }) {
    // A rota (POST /integrations/imoview/import-card) não é aninhada sob /pipelines/:pipelineId,
    // então requirePipelineRole não se aplica a ela — sem esta checagem, qualquer usuário
    // autenticado (mesmo sem nenhum vínculo com o pipeline) conseguia importar cards em
    // qualquer pipeline só informando o pipeline_id no body. Mesmo nível mínimo exigido pela
    // criação manual de card (POST /pipelines/:id/cards, requirePipelineRole('editor')).
    const actorRole = await resolveActorRole(input.pipelineId, input.userId);
    if (!roleAtLeast(actorRole, 'editor')) {
      throw AppError.forbidden('Você não tem permissão para importar cards neste pipeline');
    }

    const config = await IntegrationConfigModel.findByProvider('imoview');
    if (!config) {
      throw new AppError('Integração com o Imoview ainda não foi configurada', 422);
    }

    const client = new ImoviewClient(config.base_url, { apiKey: decrypt(config.credentials_encrypted) });

    try {
      const raw = await client.fetchEntity(input.entityType, input.externalId);
      const seed = toCardSeed(input.entityType, raw);

      const card = await CardService.create(input.pipelineId, input.userId, {
        title: seed.title,
        phase_id: input.phaseId,
      });

      await CardExternalRefModel.upsert({
        card_id: card.id,
        provider: 'imoview',
        external_id: input.externalId,
        external_type: input.entityType,
      });

      await ImoviewSyncLogModel.create({
        integration_config_id: config.id,
        direction: 'import',
        entity_type: input.entityType,
        external_id: input.externalId,
        internal_id: card.id,
        status: 'success',
        payload: raw as Record<string, unknown>,
      });

      return card;
    } catch (error) {
      await ImoviewSyncLogModel.create({
        integration_config_id: config.id,
        direction: 'import',
        entity_type: input.entityType,
        external_id: input.externalId,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw new AppError('Falha ao importar dados do Imoview. Verifique o log de sincronização.', 502);
    }
  },
};
