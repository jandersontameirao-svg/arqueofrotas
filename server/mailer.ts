// Envio de emails via SMTP (notificações do ArqueoFrotas).
//
// Projetado para ser à prova de falhas: se o SMTP não estiver configurado
// (SMTP_HOST vazio), o envio é ignorado silenciosamente. Qualquer erro de envio
// é capturado e logado — NUNCA propaga para o fluxo que disparou o email (criar
// ocorrência, etc.). O painel de notificações é a fonte da verdade; o email é
// um reforço best-effort.

import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "./_core/env";

let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;

  if (!ENV.smtpHost) {
    console.warn("[mailer] SMTP_HOST não configurado — envio de email desativado.");
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
  return Boolean(ENV.smtpHost);
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envia um email. Resolve sempre (nunca rejeita): retorna true se enviou,
 * false se o envio está desativado ou falhou. Seguro para `void sendMail(...)`.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;

  const recipients = Array.isArray(message.to)
    ? message.to.filter(Boolean)
    : [message.to].filter(Boolean);
  if (recipients.length === 0) return false;

  try {
    await tx.sendMail({
      from: ENV.smtpFrom,
      to: recipients.join(", "),
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  } catch (error) {
    console.error("[mailer] Falha ao enviar email:", error);
    return false;
  }
}
