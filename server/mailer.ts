// Envio de emails (notificações do ArqueoFrotas).
//
// Dois caminhos, nesta ordem de preferência:
//   1) Resend API (RESEND_API_KEY) — recomendado (logs e deliverability no
//      painel do Resend, não depende de portas SMTP).
//   2) SMTP (SMTP_HOST) via nodemailer — fallback.
// Se nenhum estiver configurado, o envio é ignorado silenciosamente e só o
// painel de notificações funciona.
//
// À prova de falhas: qualquer erro de envio é capturado e logado — NUNCA
// propaga para o fluxo que disparou o email (criar ocorrência, etc.). Seguro
// para `void sendMail(...)`.

import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "./_core/env";

let transporter: Transporter | null = null;
let smtpInitialized = false;

function getTransporter(): Transporter | null {
  if (smtpInitialized) return transporter;
  smtpInitialized = true;
  if (!ENV.smtpHost) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpSecure,
    auth: ENV.smtpUser ? { user: ENV.smtpUser, pass: ENV.smtpPass } : undefined,
  });
  return transporter;
}

export function isEmailEnabled(): boolean {
  return Boolean(ENV.resendApiKey || ENV.smtpHost);
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

async function sendViaResend(
  recipients: string[],
  message: MailMessage
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.mailFrom,
        to: recipients,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[mailer] Resend respondeu ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[mailer] Falha ao enviar via Resend:", error);
    return false;
  }
}

async function sendViaSmtp(
  recipients: string[],
  message: MailMessage
): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;
  try {
    await tx.sendMail({
      from: ENV.mailFrom,
      to: recipients.join(", "),
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  } catch (error) {
    console.error("[mailer] Falha ao enviar via SMTP:", error);
    return false;
  }
}

/**
 * Envia um email. Resolve sempre (nunca rejeita): retorna true se enviou,
 * false se o envio está desativado ou falhou. Seguro para `void sendMail(...)`.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const recipients = (
    Array.isArray(message.to) ? message.to : [message.to]
  ).filter(Boolean);
  if (recipients.length === 0) return false;

  if (ENV.resendApiKey) return sendViaResend(recipients, message);
  if (ENV.smtpHost) return sendViaSmtp(recipients, message);

  console.warn("[mailer] Nenhum provedor de email configurado — envio ignorado.");
  return false;
}
