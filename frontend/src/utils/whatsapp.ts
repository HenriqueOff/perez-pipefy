/** Monta um link wa.me (click-to-chat) sem depender de nenhuma credencial da API oficial
 * do WhatsApp Business — abre o WhatsApp do próprio usuário com a conversa já iniciada. */
export function buildWhatsAppLink(rawPhone: string, message?: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  // Números digitados sem DDI (só DDD + número, o comum por aqui) recebem o +55 do Brasil.
  const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${withCountryCode}${query}`;
}
