import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  vehicles,
  checklists,
  occurrences,
  serviceOrders,
  serviceOrderItems,
  vehicleDocuments,
  occurrenceAttachments,
  vehicleFines,
  reservations,
  type User,
} from "../../drizzle/schema";
import type { Database } from "./runtime";
const denied = () => {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Registro indisponível para este usuário",
  });
};
export function assertOwner(user: User, ownerId: number | null) {
  if (user.role === "motorista" && user.id !== ownerId) denied();
}
export async function authorizeOperation(
  db: Database,
  user: User,
  path: string,
  raw: Record<string, unknown>,
  lock = false
) {
  const [module, operation] = path.split(".");
  let vehicleId = typeof raw.vehicleId === "number" ? raw.vehicleId : undefined;
  const id = typeof raw.id === "number" ? raw.id : undefined;
  if (module === "vehicles" && id) vehicleId = id;
  if (module === "checklists" && id) {
    const [row] = await db
      .select()
      .from(checklists)
      .where(eq(checklists.id, id));
    if (!row || row.isDeleted) denied();
    assertOwner(user, row.userId);
    vehicleId = row.vehicleId;
  }
  if (module === "occurrences") {
    const occurrenceId =
      typeof raw.occurrenceId === "number" ? raw.occurrenceId : id;
    if (occurrenceId) {
      const [row] = await db
        .select()
        .from(occurrences)
        .where(eq(occurrences.id, occurrenceId));
      if (!row || row.isDeleted) denied();
      assertOwner(user, row.reportedById);
      vehicleId = row.vehicleId;
    }
  }
  if (module === "vehicleDocuments" && id) {
    const [row] = await db
      .select()
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.id, id));
    if (!row) denied();
    vehicleId = row.vehicleId;
  }
  if (module === "vehicleFines" && id) {
    const [row] = await db
      .select()
      .from(vehicleFines)
      .where(eq(vehicleFines.id, id));
    if (!row || row.isDeleted) denied();
    if (
      !["admin", "gestor_frota"].includes(user.role) &&
      user.id !== row.responsibleDriverId
    )
      denied();
    vehicleId = row.vehicleId;
  }
  if (module === "serviceOrders") {
    let orderId =
      typeof raw.serviceOrderId === "number" ? raw.serviceOrderId : id;
    if (operation === "removeItem" && id) {
      const [item] = await db
        .select()
        .from(serviceOrderItems)
        .where(eq(serviceOrderItems.id, id));
      if (!item) denied();
      orderId = item.serviceOrderId;
    }
    if (orderId) {
      const [row] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, orderId));
      if (
        !row ||
        row.isDeleted ||
        (user.role === "manutencao" && row.assignedToId !== user.id)
      )
        denied();
      if (
        user.role === "manutencao" &&
        operation === "update" &&
        Object.keys(raw).some(
          k =>
            !["id", "executionNotes", "requestId", "idempotencyKey"].includes(k)
        )
      )
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Manutenção pode alterar apenas notas da OS atribuída",
        });
      if (
        ["addItem", "removeItem", "update"].includes(operation) &&
        ["concluida", "cancelada", "pendente_aprovacao", "aprovada"].includes(
          row.status
        )
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "OS finalizada ou em aprovação não permite alterar o orçamento",
        });
      vehicleId = row.vehicleId;
    }
  }
  if (module === "reservations" && id) {
    const [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    if (!row) denied();
    if (
      !["admin", "gestor_frota"].includes(user.role) &&
      user.id !== row.userId
    )
      denied();
    vehicleId = row.vehicleId;
  }
  if (vehicleId) {
    const query = db.select().from(vehicles).where(eq(vehicles.id, vehicleId));
    const [vehicle] = lock ? await query.for("update") : await query;
    if (!vehicle) denied();
  }
  return vehicleId;
}
