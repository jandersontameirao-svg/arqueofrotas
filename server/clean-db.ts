/**
 * Script para limpar o banco de dados para produção
 * Remove todos os dados de seed/teste, mantendo apenas a estrutura
 */

import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  checklistResponses,
  checklists,
  checklistTemplateItems,
  checklistTemplates,
  maintenancePlans,
  vehicleMaintenanceStatus,
  occurrenceAttachments,
  occurrenceComments,
  occurrences,
  projects,
  reservations,
  serviceOrderAttachments,
  serviceOrderItems,
  serviceOrders,
  units,
  vehicleDocuments,
  vehicles,
} from "../drizzle/schema";

async function cleanDatabase() {
  console.log("🧹 Iniciando limpeza do banco de dados para produção...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL não configurada");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  try {
    // Limpar na ordem correta para respeitar as foreign keys
    console.log("Limpando logs de auditoria...");
    await db.delete(auditLogs);

    console.log("Limpando respostas de checklists...");
    await db.delete(checklistResponses);

    console.log("Limpando checklists executados...");
    await db.delete(checklists);

    console.log("Limpando itens de templates de checklist...");
    await db.delete(checklistTemplateItems);

    console.log("Limpando templates de checklist...");
    await db.delete(checklistTemplates);

    console.log("Limpando anexos de ocorrências...");
    await db.delete(occurrenceAttachments);

    console.log("Limpando comentários de ocorrências...");
    await db.delete(occurrenceComments);

    console.log("Limpando ocorrências...");
    await db.delete(occurrences);

    console.log("Limpando anexos de ordens de serviço...");
    await db.delete(serviceOrderAttachments);

    console.log("Limpando itens de ordens de serviço...");
    await db.delete(serviceOrderItems);

    console.log("Limpando ordens de serviço...");
    await db.delete(serviceOrders);

    console.log("Limpando status de manutenção...");
    await db.delete(vehicleMaintenanceStatus);

    console.log("Limpando planos de manutenção...");
    await db.delete(maintenancePlans);

    console.log("Limpando reservas...");
    await db.delete(reservations);

    console.log("Limpando documentos de veículos...");
    await db.delete(vehicleDocuments);

    console.log("Limpando veículos...");
    await db.delete(vehicles);

    console.log("Limpando projetos...");
    await db.delete(projects);

    console.log("Limpando unidades...");
    await db.delete(units);

    console.log("\n✅ Banco de dados limpo com sucesso!");
    console.log("O sistema está pronto para uso em produção.");
    console.log("\nPróximos passos:");
    console.log("1. Cadastre as unidades da empresa");
    console.log("2. Cadastre os projetos/centros de custo");
    console.log("3. Cadastre os veículos da frota");
    console.log("4. Configure os templates de checklist");
    console.log("5. Convide os usuários para o sistema");

  } catch (error) {
    console.error("❌ Erro ao limpar banco de dados:", error);
    process.exit(1);
  }

  process.exit(0);
}

cleanDatabase();
