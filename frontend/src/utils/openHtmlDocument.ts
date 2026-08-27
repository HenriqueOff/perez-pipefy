/** Abre um HTML gerado (ex. contrato interpolado) numa aba nova, pronta pra o usuário
 * imprimir/salvar como PDF pelo diálogo nativo do navegador (Ctrl+P). */
export function openHtmlDocument(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
