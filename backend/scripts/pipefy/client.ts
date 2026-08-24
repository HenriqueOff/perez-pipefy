import 'dotenv/config';

export const PIPEFY_ORG_ID = '301342859';

const ENDPOINT = 'https://api.pipefy.com/graphql';

function getToken(): string {
  const token = process.env.PIPEFY_API_TOKEN;
  if (!token) throw new Error('PIPEFY_API_TOKEN não encontrado no .env');
  return token;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A API do Pipefy devolve 429 sob uso intenso (16 pipes / milhares de cards batem nisso
 * fácil) — backoff exponencial simples em vez de deixar o script morrer no meio de uma
 * importação longa.
 */
export async function pipefyGraphQL<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  let attempt = 0;

  while (true) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429 && attempt < 5) {
      attempt += 1;
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    const body = await res.json();
    if (body.errors) {
      throw new Error(`Erro GraphQL Pipefy: ${JSON.stringify(body.errors)}`);
    }
    return body.data as T;
  }
}

/** Aceita vírgula OU espaço como separador — o git-bash no Windows às vezes troca vírgulas
 * por espaços num argumento `--flag=a,b,c` antes mesmo do Node receber o argv. */
export function parsePipeIds(pipesArg: string): string[] {
  return pipesArg
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseArgs(argv: string[]): { flags: Record<string, string | boolean>; positional: string[] } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value ?? true;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}
