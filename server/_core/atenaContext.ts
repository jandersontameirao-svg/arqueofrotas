import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  atenaMemories,
  vehicles,
  serviceOrders,
  occurrences,
  vehicleFines,
  vehicleDocuments,
  auditLogs,
  type AtenaMemory,
} from "../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Diretrizes aprendidas ativas, mais recentes primeiro. */
export async function getActiveMemories(db: Db): Promise<AtenaMemory[]> {
  return db
    .select()
    .from(atenaMemories)
    .where(eq(atenaMemories.active, true))
    .orderBy(desc(atenaMemories.createdAt));
}

/** Bloco de memórias para injetar no system prompt de toda geração da Atena. */
export function buildMemoriesPrompt(memories: AtenaMemory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m, i) => `${i + 1}. [${m.category}] ${m.directive}`);
  return [
    "DIRETRIZES APRENDIDAS (regras que a equipe te ensinou — siga-as sempre que aplicável):",
    ...lines,
  ].join("\n");
}

const countOf = async (
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  where?: ReturnType<typeof eq>
): Promise<number> => {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(where);
  return Number(row?.n ?? 0);
};

/**
 * "Retrato" dos dados reais da frota, lido a cada mensagem. É o que torna a
 * Atena útil (responde sobre o que de fato aconteceu) em vez de genérica.
 * Regra forte no prompt que a consome: só afirmar sobre eventos reais com base
 * nestes registros; se não constar, dizer que não consta.
 */
export async function buildRealDataContext(db: Db): Promise<string> {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalVeiculos,
    veiculosAtivos,
    veiculosManutencao,
    veiculosBaixados,
    osAbertas,
    osPendentesAprovacao,
    ocorrenciasAbertas,
    multasPendentes,
  ] = await Promise.all([
    countOf(db, vehicles),
    countOf(db, vehicles, eq(vehicles.status, "ativo")),
    countOf(db, vehicles, eq(vehicles.status, "manutencao")),
    countOf(db, vehicles, eq(vehicles.status, "baixado")),
    countOf(db, serviceOrders, eq(serviceOrders.status, "aberta")),
    countOf(db, serviceOrders, eq(serviceOrders.status, "pendente_aprovacao")),
    countOf(db, occurrences, eq(occurrences.status, "aberto")),
    countOf(db, vehicleFines, eq(vehicleFines.status, "pendente")),
  ]);

  // Documentos vencendo nos próximos 30 dias.
  const docsVencendo = await db
    .select({
      plate: vehicles.plate,
      documentType: vehicleDocuments.documentType,
      expirationDate: vehicleDocuments.expirationDate,
    })
    .from(vehicleDocuments)
    .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
    .where(
      and(
        gte(vehicleDocuments.expirationDate, now),
        sql`${vehicleDocuments.expirationDate} <= ${in30}`
      )
    )
    .limit(20);

  // Últimos ~80 registros de auditoria (quem fez o quê, quando).
  const recentAudit = await db
    .select({
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      userName: auditLogs.userName,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.id))
    .limit(80);

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "-";

  const auditLines = recentAudit.map(
    a =>
      `- ${fmt(a.createdAt)} | ${a.userName ?? "sistema"} | ${a.action} ${a.entityType}${
        a.entityId ? ` #${a.entityId}` : ""
      }`
  );

  const docLines = docsVencendo.map(
    d => `- ${d.plate}: ${d.documentType} vence em ${fmt(d.expirationDate)}`
  );

  return [
    "RETRATO DOS DADOS REAIS DA FROTA (agora):",
    `Veículos: ${totalVeiculos} (ativos ${veiculosAtivos}, em manutenção ${veiculosManutencao}, baixados ${veiculosBaixados}).`,
    `Ordens de serviço: ${osAbertas} abertas, ${osPendentesAprovacao} pendentes de aprovação.`,
    `Ocorrências em aberto: ${ocorrenciasAbertas}.`,
    `Multas pendentes: ${multasPendentes}.`,
    "",
    docLines.length
      ? `DOCUMENTOS VENCENDO (próximos 30 dias):\n${docLines.join("\n")}`
      : "DOCUMENTOS VENCENDO (próximos 30 dias): nenhum.",
    "",
    auditLines.length
      ? `HISTÓRICO RECENTE (auditoria, mais novo primeiro):\n${auditLines.join("\n")}`
      : "HISTÓRICO RECENTE (auditoria): sem registros.",
  ].join("\n");
}
