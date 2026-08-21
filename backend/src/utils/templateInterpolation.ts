/**
 * Interpola placeholders simples em modelos de e-mail: {{title}} para o título do card
 * e {{campo.<key>}} para o valor de um campo customizado do card (pela key do campo).
 */
export function interpolateTemplate(
  text: string,
  context: { title: string; fields: Record<string, unknown> }
): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, token: string) => {
    if (token === 'title') return context.title;
    if (token.startsWith('campo.')) {
      const key = token.slice('campo.'.length);
      const value = context.fields[key];
      return value == null ? '' : String(value);
    }
    return match;
  });
}
