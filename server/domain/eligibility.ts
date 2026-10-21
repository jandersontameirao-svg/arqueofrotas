import { and, eq, ne, lt, gt, notInArray } from "drizzle-orm";
import {
  vehicles,
  occurrences,
  serviceOrders,
  reservations,
} from "../../drizzle/schema";
import type { Database } from "./runtime";
import { TRPCError } from "@trpc/server";
export function validateInterval(start: Date, end: Date) {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "O fim deve ser posterior ao início; intervalos usam [início, fim)",
    });
}
export async function vehicleEligibility(
  db: Database,
  vehicleId: number,
  start = new Date(),
  end = new Date(start.getTime() + 1),
  excludeReservationId?: number,
  ignoreMaintenanceStatus = false
) {
  validateInterval(start, end);
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId));
  const reasons: string[] = [];
  if (!vehicle?.active) reasons.push("cadastro_inativo");
  if (vehicle?.status === "baixado") reasons.push("baixado");
  if (!ignoreMaintenanceStatus && vehicle?.status === "manutencao")
    reasons.push("manutencao");
  const critical = await db
    .select({ id: occurrences.id })
    .from(occurrences)
    .where(
      and(
        eq(occurrences.vehicleId, vehicleId),
        eq(occurrences.isDeleted, false),
        eq(occurrences.severity, "alta"),
        ne(occurrences.status, "encerrado")
      )
    )
    .limit(1);
  if (critical.length) reasons.push("ocorrencia_critica");
  const orders = await db
    .select({ id: serviceOrders.id })
    .from(serviceOrders)
    .where(
      and(
        eq(serviceOrders.vehicleId, vehicleId),
        eq(serviceOrders.isDeleted, false),
        notInArray(serviceOrders.status, [
          "rascunho",
          "rejeitada",
          "concluida",
          "cancelada",
        ])
      )
    )
    .limit(1);
  if (orders.length) reasons.push("ordem_servico");
  const bookings = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.vehicleId, vehicleId),
        notInArray(reservations.status, ["concluida", "cancelada"]),
        excludeReservationId
          ? ne(reservations.id, excludeReservationId)
          : undefined
      )
    );
  if (bookings.some(r => r.status === "em_uso")) reasons.push("em_uso");
  if (
    bookings.some(
      r => r.status === "agendada" && r.startDate < end && r.endDate > start
    )
  )
    reasons.push("reserva_conflitante");
  return { eligible: reasons.length === 0, reasons, vehicle };
}
export async function reconcileVehicle(db: Database, vehicleId: number) {
  const eligibility = await vehicleEligibility(
    db,
    vehicleId,
    undefined,
    undefined,
    undefined,
    true
  );
  if (
    eligibility.vehicle?.status === "manutencao" &&
    !eligibility.reasons.some(r =>
      [
        "cadastro_inativo",
        "baixado",
        "ocorrencia_critica",
        "ordem_servico",
      ].includes(r)
    )
  ) {
    // Manual/legacy holds are checked separately before automatic release.
    const { vehicleHolds } = await import("../../drizzle/schema");
    const holds = await db
      .select()
      .from(vehicleHolds)
      .where(
        and(
          eq(vehicleHolds.vehicleId, vehicleId),
          eq(vehicleHolds.active, true)
        )
      );
    if (!holds.length)
      await db
        .update(vehicles)
        .set({ status: "ativo" })
        .where(eq(vehicles.id, vehicleId));
  }
  return vehicleEligibility(db, vehicleId);
}
