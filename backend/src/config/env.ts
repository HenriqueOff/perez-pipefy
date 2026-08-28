import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: required('JWT_SECRET'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
  jwtRefreshExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 7),
  credentialsEncryptionKey: required('CREDENTIALS_ENCRYPTION_KEY'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // 'lax' funciona quando front e back dividem o mesmo domínio (dev local via proxy do
  // Vite). Em produção, front (Render static site) e back (Render web service) ficam em
  // domínios diferentes, então o cookie de refresh token precisa de SameSite=None+Secure
  // para o navegador aceitar enviá-lo nas chamadas cross-site.
  cookieCrossSite: process.env.COOKIE_CROSS_SITE === 'true',
  // Storage dos anexos: 'local' grava em disco (padrão, usado no Docker/dev local);
  // 'supabase' envia para um bucket do Supabase Storage (usado em produção no Render,
  // onde o filesystem é efêmero).
  storageDriver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'supabase',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'attachments',
  // E-mail de "esqueci minha senha" via Resend. Sem RESEND_API_KEY configurada, o pedido
  // de redefinição falha ao tentar enviar (não trava o resto do app, igual ao Supabase).
  resendApiKey: process.env.RESEND_API_KEY,
  mailFrom: process.env.MAIL_FROM ?? 'Pipelines <onboarding@resend.dev>',
  // URL do frontend usada pra montar o link de redefinição de senha. Sem FRONTEND_URL
  // definida, reaproveita o CORS_ORIGIN (na prática sempre a mesma URL nesta app).
  frontendUrl: process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Scans periódicos (SLA das fases + automações recorrentes):
  //   'interval' (padrão) — setInterval dentro do processo do backend;
  //   'off'               — não roda in-process (use quando um cron externo bate em
  //                         POST /api/v1/internal/run-scans).
  backgroundScans: (process.env.BACKGROUND_SCANS ?? 'interval') as 'interval' | 'off',
  // Segredo compartilhado para POST /api/v1/internal/run-scans (cabeçalho
  // X-Internal-Secret). Sem isto definido, o endpoint interno responde 404.
  internalApiSecret: process.env.INTERNAL_API_SECRET,
};
