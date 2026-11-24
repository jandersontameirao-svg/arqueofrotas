import { eq, and } from "drizzle-orm";
import { router, gestorProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  vehicles,
  checklists,
  checklistResponses,
  checklistTemplateItems,
  occurrences,
  serviceOrders,
} from "../../drizzle/schema";

export const analyticsRouter = router({
  // Itens que mais causam problemas na frota (análise por dados).
  // Base objetiva para, no futuro, alimentar uma camada de IA.
  problemItems: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Respostas "Não OK" com a descrição do item do template
    const naoOk = await db
      .select({
        checklistId: checklistResponses.checklistId,
        description: checklistTemplateItems.description,
        category: checklistTemplateItems.category,
        isCritical: checklistTemplateItems.isCritical,
        vehicleId: checklists.vehicleId,
      })
      .from(checklistResponses)
      .innerJoin(
        checklistTemplateItems,
        eq(checklistResponses.templateItemId, checklistTemplateItems.id)
      )
      .innerJoin(checklists, eq(checklistResponses.checklistId, checklists.id))
      .where(eq(checklistResponses.response, "nao_ok"));

    // Agrupa por descrição do item
    const itemMap = new Map<
      string,
      { description: string; category: string | null; isCritical: boolean; count: number }
    >();
    for (const r of naoOk) {
      const key = r.description;
      const cur = itemMap.get(key);
      if (cur) cur.count += 1;
      else
        itemMap.set(key, {
          description: r.description,
          category: r.category ?? null,
          isCritical: r.isCritical,
          count: 1,
        });
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Ocorrências (não excluídas) por veículo e abertas
    const occ = await db
      .select({
        vehicleId: occurrences.vehicleId,
        status: occurrences.status,
        severity: occurrences.severity,
      })
      .from(occurrences)
      .where(eq(occurrences.isDeleted, false));

    // OS (não excluídas) por veículo
    const os = await db
      .select({ vehicleId: serviceOrders.vehicleId })
      .from(serviceOrders)
      .where(eq(serviceOrders.isDeleted, false));

    // Veículos para rotular
    const vehicleRows = await db
      .select({
        id: vehicles.id,
        plate: vehicles.plate,
        fleetNumber: vehicles.fleetNumber,
        model: vehicles.model,
      })
      .from(vehicles)
      .where(eq(vehicles.active, true));

    type VStat = {
      vehicleId: number;
      plate: string;
      fleetNumber: string | null;
      model: string;
      naoOk: number;
      occurrences: number;
      openOccurrences: number;
      serviceOrders: number;
    };
    const vmap = new Map<number, VStat>();
    for (const v of vehicleRows)
      vmap.set(v.id, {
        vehicleId: v.id,
        plate: v.plate,
        fleetNumber: v.fleetNumber,
        model: v.model,
        naoOk: 0,
        occurrences: 0,
        openOccurrences: 0,
        serviceOrders: 0,
      });

    for (const r of naoOk) {
      const v = vmap.get(r.vehicleId);
      if (v) v.naoOk += 1;
    }
    for (const o of occ) {
      const v = vmap.get(o.vehicleId);
      if (v) {
        v.occurrences += 1;
        if (o.status !== "encerrado") v.openOccurrences += 1;
      }
    }
    for (const s of os) {
      const v = vmap.get(s.vehicleId);
      if (v) v.serviceOrders += 1;
    }

    const topVehicles = Array.from(vmap.values())
      .map(v => ({ ...v, score: v.naoOk + v.occurrences + v.serviceOrders }))
      .filter(v => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Totais por severidade das ocorrências
    const bySeverity = occ.reduce(
      (acc, o) => {
        acc[o.severity] = (acc[o.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      topItems,
      topVehicles,
      bySeverity,
      totalNaoOk: naoOk.length,
      totalOccurrences: occ.length,
    };
  }),
});
