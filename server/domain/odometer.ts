import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { vehicles, odometerReadings, type User } from "../../drizzle/schema";
import type { Database } from "./runtime";
export async function recordKm(
  db: Database,
  user: User,
  vehicleId: number,
  km: number,
  source: string,
  collectedAt = new Date(),
  reason?: string
) {
  if (!Number.isSafeInteger(km) || km < 0 || km > 2147483647)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Quilometragem inválida",
    });
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .for("update");
  if (!vehicle)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Veículo não encontrado",
    });
  if (reason && !["admin", "gestor_frota"].includes(user.role))
    throw new TRPCError({ code: "FORBIDDEN" });
  if (!reason && km < vehicle.currentKm)
    throw new TRPCError({
      code: "CONFLICT",
      message: `Leitura ${km} km inferior aos ${vehicle.currentKm} km confirmados. Solicite reconciliação ao gestor; o registro local foi preservado.`,
    });
  await db
    .insert(odometerReadings)
    .values({
      vehicleId,
      userId: user.id,
      source,
      originalKm: km,
      previousKm: vehicle.currentKm,
      correctedKm: reason ? km : null,
      reason,
      collectedAt,
    });
  await db
    .update(vehicles)
    .set({ currentKm: km })
    .where(eq(vehicles.id, vehicleId));
  return vehicle;
}
