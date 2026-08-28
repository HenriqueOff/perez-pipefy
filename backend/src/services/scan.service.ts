import { db } from '../config/db';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';
import { AutomationService } from './automation.service';

// Chave arbitrária, fixa, para o advisory lock do Postgres. Só precisa ser a mesma em
// todas as instâncias do backend. Exportada só para os testes exercitarem o lock.
export const SCAN_ADVISORY_LOCK_KEY = 4820573;

/**
 * Roda os dois scans periódicos do sistema (SLA das fases + automações recorrentes).
 *
 * LIMITAÇÃO CONHECIDA: hoje isto é disparado por um setInterval dentro do processo do
 * backend (server.ts). Num backend que dorme (plano free do Render) o intervalo pode
 * nunca completar; o certo em produção séria é um cron/worker externo batendo em
 * POST /api/v1/internal/run-scans (ver internal.routes.ts e DEPLOY.md).
 *
 * Enquanto o disparo continua in-process, um advisory lock do Postgres garante que, com
 * 2+ instâncias, só uma roda o scan por vez — as automações recorrentes já são
 * idempotentes (AutomationRecurrenceModel) e as notificações de SLA também
 * (NotificationModel.existsForCardSinceType), então o lock evita trabalho duplicado, não
 * corrupção.
 */
export const ScanService = {
  async runDueScans(): Promise<{ ran: boolean }> {
    // Lock em escopo de transação: é liberado sozinho no commit/rollback e fica preso à
    // mesma conexão (um pg_advisory_lock de sessão poderia ser adquirido numa conexão do
    // pool e "liberado" noutra). A transação em si não escreve nada — cada scan usa suas
    // próprias conexões e comita por conta própria.
    return db.transaction(async (trx) => {
      const result = await trx.raw<{ rows: { locked: boolean }[] }>(
        'select pg_try_advisory_xact_lock(?) as locked',
        [SCAN_ADVISORY_LOCK_KEY]
      );
      if (!result.rows[0]?.locked) {
        logger.debug('Scan periódico pulado: outra instância já está rodando');
        return { ran: false };
      }

      await NotificationService.scanSlaBreaches().catch((err) =>
        logger.error({ err }, 'Falha ao verificar SLA das fases')
      );
      await AutomationService.scanRecurringAutomations().catch((err) =>
        logger.error({ err }, 'Falha ao verificar automações recorrentes')
      );

      return { ran: true };
    });
  },
};
