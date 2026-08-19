import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { NotificationService } from './services/notification.service';

// Rede de segurança: uma promise rejeitada sem .catch (ex.: middleware async não
// envolvido em asyncHandler) por padrão derruba o processo inteiro. Aqui só logamos.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

const app = createApp();

app.listen(env.port, () => {
  logger.info(`Servidor rodando na porta ${env.port}`);
});

const SLA_SCAN_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
  NotificationService.scanSlaBreaches().catch((err) => logger.error({ err }, 'Falha ao verificar SLA das fases'));
}, SLA_SCAN_INTERVAL_MS);
