import dns from 'dns';
import { AppError } from './AppError';

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (inclui metadata de nuvem)
  if (a === 0) return true; // 0.0.0.0/8
  if (a >= 224) return true; // multicast/reservado (224.0.0.0/4 em diante)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique local
  if (lower.startsWith('fe80')) return true; // fe80::/10 link-local
  // IPv4-mapeado (::ffff:a.b.c.d) precisa checar o IPv4 embutido
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export interface PinnedAddress {
  address: string;
  family: 4 | 6;
}

/**
 * Guarda contra SSRF pra ação de automação "faça uma requisição HTTP": o autor da
 * automação já é um usuário de confiança (requirePipelineRole('manager')), então isso não
 * é uma allowlist rígida — só evita que uma URL interna colada por engano (ou um valor
 * interpolado de um campo) faça a automação bater na rede interna.
 *
 * Resolve o DNS e valida TODOS os endereços retornados, mas devolve só o primeiro como
 * "pinned": quem chama deve usá-lo para a conexão de verdade (em vez de deixar a lib HTTP
 * resolver de novo), senão essa validação vira só decoração — um DNS malicioso poderia
 * responder um IP público aqui e um IP interno na hora da conexão real (DNS rebinding).
 */
export async function resolvePinnedAddress(rawUrl: string): Promise<{ url: URL; pinned: PinnedAddress }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError(`URL inválida: "${rawUrl}"`, 422);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError(`Protocolo não permitido: "${url.protocol}"`, 422);
  }

  const addresses = await dns.promises.lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new AppError(`Não foi possível resolver o host: "${url.hostname}"`, 422);
  }
  for (const { address, family } of addresses) {
    const isPrivate = family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
    if (isPrivate) {
      throw new AppError(`URL aponta para um endereço de rede interno: "${url.hostname}"`, 422);
    }
  }

  const [{ address, family }] = addresses;
  return { url, pinned: { address, family: family as 4 | 6 } };
}

/** Mantido para quem só precisa validar (ex. testes) sem fixar o endereço numa conexão. */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  await resolvePinnedAddress(rawUrl);
}
