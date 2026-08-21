/**
 * Moldura visual compartilhada por todo e-mail que o sistema manda (redefinição de senha,
 * e-mails de automação via modelo). E-mail não suporta flexbox/grid nem <style> de forma
 * confiável em todos os clientes — por isso tabela + estilos inline. `background` do
 * cabeçalho declara a cor sólida ANTES do gradiente: clientes que não entendem gradiente
 * (Outlook desktop) ficam com a cor sólida, os demais sobrescrevem com o gradiente.
 */
export function wrapBrandedEmail(bodyHtml: string, cta?: { label: string; url: string }): string {
  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr>
          <td style="border-radius:6px;background-color:#4f46e5;">
            <a href="${cta.url}" style="display:inline-block;padding:11px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,Helvetica,sans-serif;border-radius:6px;">${cta.label}</a>
          </td>
        </tr>
      </table>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e1ec;">
            <tr>
              <td style="background-color:#4f46e5;background-image:linear-gradient(135deg,#4f46e5,#2f2591);padding:28px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Pipelines</span><br />
                <span style="color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:0.03em;font-family:Arial,Helvetica,sans-serif;">PEREZ &amp; FILHO</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1e1b2e;font-size:14px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                ${bodyHtml}
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f8f8fb;border-top:1px solid #e2e1ec;color:#9692a8;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
                Este e-mail foi enviado automaticamente pelo Pipelines (PEREZ &amp; FILHO). Se você não esperava essa mensagem, pode ignorá-la.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
