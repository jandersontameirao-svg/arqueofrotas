import { eq, and, ne } from "drizzle-orm";
import { router, gestorProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  vehicles,
  serviceOrders,
  serviceOrderItems,
  vehicleFines,
  vehicleAccidents,
} from "../../drizzle/schema";

type VehicleCost = {
  vehicleId: number;
  plate: string;
  fleetNumber: string | null;
  model: string;
  maintenance: number;
  fines: number;
  accidents: number;
  total: number;
};

export const costsRouter = router({
  // Custos totais da frota: geral e por veículo (manutenção + multas + sinistros)
  summary: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const vehicleRows = await db
      .select({
        id: vehicles.id,
        plate: vehicles.plate,
        fleetNumber: vehicles.fleetNumber,
        model: vehicles.model,
      })
      .from(vehicles)
      .where(eq(vehicles.active, true));

    const byId = new Map<number, VehicleCost>();
    for (const v of vehicleRows) {
      byId.set(v.id, {
        vehicleId: v.id,
        plate: v.plate,
        fleetNumber: v.fleetNumber,
        model: v.model,
        maintenance: 0,
        fines: 0,
        accidents: 0,
        total: 0,
      });
    }

    // Manutenção: soma dos itens de OS não excluídas
    const osItems = await db
      .select({
        vehicleId: serviceOrders.vehicleId,
        totalPrice: serviceOrderItems.totalPrice,
      })
      .from(serviceOrderItems)
      .innerJoin(
        serviceOrders,
        eq(serviceOrderItems.serviceOrderId, serviceOrders.id)
      )
      .where(eq(serviceOrders.isDeleted, false));
    for (const row of osItems) {
      const entry = byId.get(row.vehicleId);
      if (entry) entry.maintenance += Number(row.totalPrice || 0);
    }

    // Multas: soma do valor das multas não excluídas e não canceladas
    const fineRows = await db
      .select({
        vehicleId: vehicleFines.vehicleId,
        amount: vehicleFines.amount,
        paidAmount: vehicleFines.paidAmount,
      })
      .from(vehicleFines)
      .where(
        and(
          eq(vehicleFines.isDeleted, false),
          ne(vehicleFines.status, "cancelada")
        )
      );
    for (const row of fineRows) {
      const entry = byId.get(row.vehicleId);
      if (entry)
        entry.fines += Number(row.paidAmount || row.amount || 0);
    }

    // Sinistros: custo final, ou estimado quando não há final
    const accidentRows = await db
      .select({
        vehicleId: vehicleAccidents.vehicleId,
        estimatedCost: vehicleAccidents.estimatedCost,
        finalCost: vehicleAccidents.finalCost,
      })
      .from(vehicleAccidents)
      .where(eq(vehicleAccidents.isDeleted, false));
    for (const row of accidentRows) {
      const entry = byId.get(row.vehicleId);
      if (entry)
        entry.accidents += Number(row.finalCost || row.estimatedCost || 0);
    }

    const byVehicle = Array.from(byId.values()).map(v => ({
      ...v,
      total: v.maintenance + v.fines + v.accidents,
    }));
    byVehicle.sort((a, b) => b.total - a.total);

    const totals = byVehicle.reduce(
      (acc, v) => ({
        maintenance: acc.maintenance + v.maintenance,
        fines: acc.fines + v.fines,
        accidents: acc.accidents + v.accidents,
        total: acc.total + v.total,
      }),
      { maintenance: 0, fines: 0, accidents: 0, total: 0 }
    );

    return { byVehicle, totals };
  }),
});
