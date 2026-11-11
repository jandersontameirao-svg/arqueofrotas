// Rotina diária de aviso de documento de veículo vencendo.
//
// O schema já previa isto: vehicleDocuments tem expirationDate e as flags
// alert30Sent / alert15Sent / alert7Sent. Faltava a rotina que verifica os
// vencimentos e dispara o aviso (painel + email) uma única vez por faixa.
//
// À prova de falhas: qualquer erro é capturado e logado — nunca derruba o
// processo do servidor.

import { and, eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  vehicleDocuments,
  vehicles,
  users,
  appNotifications,
} from "../../drizzle/schema";
import { sendMail } from "../mailer";
import { ENV } from "../_core/env";

const DOC_LABELS: Record<string, string> = {
  crlv: "CRLV",
  seguro: "Seguro",
  licenciamento: "Licenciamento",
  outros: "Documento",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Verifica documentos vencendo e dispara os avisos pendentes. Retorna quantos
 * avisos foram enviados (útil para logs/testes). Nunca lança.
 */
export async function checkExpiringDocuments(now: Date = new Date()): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;

    // Documentos com vencimento definido, de veículos ativos.
    const docs = await db
      .select({
        id: vehicleDocuments.id,
        documentType: vehicleDocuments.documentType,
        expirationDate: vehicleDocuments.expirationDate,
        alert30Sent: vehicleDocuments.alert30Sent,
        alert15Sent: vehicleDocuments.alert15Sent,
        alert7Sent: vehicleDocuments.alert7Sent,
        plate: vehicles.plate,
      })
      .from(vehicleDocuments)
      .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
      .where(
        and(
          isNotNull(vehicleDocuments.expirationDate),
          eq(vehicles.active, true)
        )
      );

    if (docs.length === 0) return 0;

    // Destinatários do painel/email: admins e gestores ativos.
    const managers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.active, true),
          or(eq(users.role, "admin"), eq(users.role, "gestor_frota"))
        )
      );
    if (managers.length === 0) return 0;
    const emailTo = managers.map(m => m.email).filter((e): e is string => !!e);

    let sent = 0;
    for (const doc of docs) {
      if (!doc.expirationDate) continue;
      const dias = daysUntil(doc.expirationDate, now);
      if (dias < 0) continue; // já vencido: fora do escopo deste aviso

      // Escolhe a faixa mais urgente ainda não avisada.
      let faixa: 7 | 15 | 30 | null = null;
      if (dias <= 7 && doc.alert7Sent !== true) faixa = 7;
      else if (dias <= 15 && doc.alert15Sent !== true) faixa = 15;
      else if (dias <= 30 && doc.alert30Sent !== true) faixa = 30;
      if (faixa === null) continue;

      const label = DOC_LABELS[doc.documentType] ?? "Documento";
      const plate = doc.plate ?? "veículo";
      const venc = doc.expirationDate.toLocaleDateString("pt-BR");
      const diasTxt = dias === 0 ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;

      // Marca a flag ANTES de enviar (idempotência: não reenvia a mesma faixa).
      const flagCol =
        faixa === 7
          ? { alert7Sent: true }
          : faixa === 15
            ? { alert15Sent: true }
            : { alert30Sent: true };
      await db
        .update(vehicleDocuments)
        .set(flagCol)
        .where(eq(vehicleDocuments.id, doc.id));

      for (const m of managers) {
        await db.insert(appNotifications).values({
          userId: m.id,
          type: "documento_vencendo",
          title: `${label} ${diasTxt} (${plate})`,
          message: `O ${label} do veículo ${plate} ${diasTxt} (vencimento em ${venc}).`,
          entityType: "vehicle_document",
          entityId: doc.id,
        });
      }

      if (emailTo.length > 0) {
        void sendMail({
          to: emailTo,
          subject: `${label} ${diasTxt} — ${plate}`,
          text:
            `Aviso de vencimento de documento.\n\n` +
            `Veículo: ${plate}\nDocumento: ${label}\nVencimento: ${venc} (${diasTxt}).`,
          html:
            `<p>Aviso de vencimento de documento.</p>` +
            `<p><strong>Veículo:</strong> ${plate}<br>` +
            `<strong>Documento:</strong> ${label}<br>` +
            `<strong>Vencimento:</strong> ${venc} (${diasTxt}).</p>`,
        });
      }
      sent++;
    }
    return sent;
  } catch (error) {
    console.error("[documentAlerts] Falha ao verificar vencimentos:", error);
    return 0;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Inicia a verificação diária (roda uma vez ao subir e depois a cada 24h).
 * Seguro para ambiente de instância única (PM2 fork). Idempotente.
 */
export function startDocumentExpiryScheduler(): void {
  if (timer) return;
  // Primeira passada logo após o boot (não bloqueia o start).
  setTimeout(() => void checkExpiringDocuments(), 30_000);
  timer = setInterval(() => void checkExpiringDocuments(), DAY_MS);
}
