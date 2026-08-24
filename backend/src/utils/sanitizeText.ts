import sanitizeHtml from 'sanitize-html';

/**
 * Remove qualquer marcação HTML de campos de texto puro (título de card, corpo de
 * comentário, nome de anexo/item de checklist/etiqueta) antes de salvar. Hoje isso não é
 * uma XSS explorável — o frontend React escapa tudo na renderização, sem
 * dangerouslySetInnerHTML em lugar nenhum — mas defesa em profundidade pro dia em que
 * esse conteúdo for consumido por um canal que não escapa sozinho (export, e-mail, PDF).
 * Não usar em campos que são HTML de verdade por design (ex. email_templates.body_html).
 *
 * Pinado em sanitize-html@2.16.0 (última versão com htmlparser2 em CommonJS — da v2.17.5
 * em diante a lib passa a exigir htmlparser2 ESM-only, que quebra o `require()` deste
 * backend CommonJS e o dynamic import() dentro do Jest, que não suporta ESM sem a flag
 * --experimental-vm-modules). O CVE conhecido dessa faixa de versões (GHSA-vccv-cmxp-4j9h,
 * URIs "javascript:" passando por atributos como action/formaction) não se aplica aqui:
 * `allowedAttributes: {}` já descarta todo atributo, então o código vulnerável nunca roda.
 * Função async por consistência com o restante do módulo (fileTypeGuard.ts), embora aqui
 * não haja I/O de verdade.
 */
export async function sanitizeText(input: string): Promise<string> {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}
