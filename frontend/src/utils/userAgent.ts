/** Extração simples de "navegador · sistema" a partir do user-agent salvo no login —
 * não é um parser completo (não precisa ser: é só pra ajudar a reconhecer qual
 * dispositivo é qual na tela de sessões ativas). */
export function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconhecido';

  let browser = 'Navegador desconhecido';
  if (/edg\//i.test(userAgent)) browser = 'Edge';
  else if (/opr\/|opera/i.test(userAgent)) browser = 'Opera';
  else if (/chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/safari\//i.test(userAgent)) browser = 'Safari';

  let os = 'sistema desconhecido';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(userAgent)) os = 'iOS';
  else if (/mac os/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  return `${browser} · ${os}`;
}
