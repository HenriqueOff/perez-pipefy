import { Resend } from 'resend';
import { env } from '../config/env';
import { wrapBrandedEmail } from '../utils/emailLayout';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    if (!env.resendApiKey) {
      throw new Error('Envio de e-mail não configurado (RESEND_API_KEY ausente)');
    }
    client = new Resend(env.resendApiKey);
  }
  return client;
}

export const MailService = {
  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
    const { error } = await getClient().emails.send({
      from: env.mailFrom,
      to,
      subject,
      html,
    });
    if (error) {
      throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    }
  },

  sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const bodyHtml = `
      <p style="margin:0 0 12px;">Recebemos um pedido para redefinir a senha da sua conta no Pipelines (PEREZ &amp; FILHO).</p>
      <p style="margin:0;color:#666278;font-size:13px;">Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail.</p>
    `;
    return MailService.sendEmail({
      to,
      subject: 'Redefinir senha - Pipelines',
      html: wrapBrandedEmail(bodyHtml, { label: 'Redefinir senha', url: resetUrl }),
    });
  },
};
