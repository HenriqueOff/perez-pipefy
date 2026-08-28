/**
 * Trava de segurança: a suíte SÓ pode rodar contra um Postgres local descartável.
 * Antes desta trava, jest.config.js carregava dotenv/config -> backend/.env, que aponta
 * para o Supabase de produção: rodar `npm test` criava/apagava dados reais e podia
 * disparar e-mail de verdade. Chamada tanto pelo globalSetup (uma vez) quanto pelo
 * loadEnv de cada arquivo de teste (defesa em profundidade).
 */

const PROD_DB_MARKERS = [
  'supabase.com',
  'supabase.co',
  'pooler.',
  'neon.tech',
  'render.com',
  'rds.amazonaws.com',
  'azure.com',
];

function maskUrl(url: string): string {
  return url.replace(/\/\/[^@/]*@/, '//***:***@');
}

export function assertTestEnv(): void {
  const url = process.env.DATABASE_URL ?? '';

  if (!url) {
    throw new Error(
      'DATABASE_URL não definida ao rodar os testes. A suíte espera backend/.env.test apontando para um Postgres local descartável.'
    );
  }

  if (PROD_DB_MARKERS.some((marker) => url.includes(marker))) {
    throw new Error(
      `Recusando rodar os testes: DATABASE_URL parece ser de produção (${maskUrl(url)}). ` +
        'Os testes só rodam contra um Postgres local descartável — confira backend/.env.test e backend/jest.config.js.'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Recusando rodar os testes com NODE_ENV=production.');
  }

  if (process.env.RESEND_API_KEY) {
    throw new Error(
      'Recusando rodar os testes com RESEND_API_KEY definida (risco de enviar e-mail real). Deixe-a vazia em backend/.env.test.'
    );
  }
}
