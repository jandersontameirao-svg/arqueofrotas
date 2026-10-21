import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getDb } from "../db";
import {
  users,
  operationReceipts,
  auditLogs,
  domainEvents,
  vehicles,
  type User,
} from "../../drizzle/schema";
import { domainDb, type Database } from "./runtime";
import { authorizeOperation } from "./access";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object" && !(value instanceof Date))
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)])
    );
  return value;
}
export async function runOperation<
  T extends { ok: boolean; error?: unknown; data?: unknown },
>(
  user: User,
  path: string,
  type: string,
  rawInput: unknown,
  next: (currentUser: User) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível",
    });
  const raw = (
    rawInput && typeof rawInput === "object" ? rawInput : {}
  ) as Record<string, unknown>;
  if (type !== "mutation") {
    await authorizeOperation(db, user, path, raw);
    return next(user);
  }
  const requestId =
    typeof raw.requestId === "string" ? raw.requestId : randomUUID();
  const key = raw.idempotencyKey;
  if (
    key !== undefined &&
    (typeof key !== "string" || key.length < 8 || key.length > 100)
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Identificador estável inválido",
    });
  const receiptId = createHash("sha256")
    .update(`${user.id}:${path}:${key}`)
    .digest("hex");
  const { requestId: _request, ...businessInput } = raw;
  const inputHash = createHash("sha256")
    .update(superjson.stringify(canonical(businessInput)))
    .digest("hex");
  try {
    return await db.transaction(
      async transaction =>
        domainDb.run(transaction as unknown as Database, async () => {
          const tx = transaction as unknown as Database;
          // Consistent user -> vehicle lock order serializes duplicate commands, driver pickups and all vehicle rules.
          const [current] = await tx
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .for("update");
          if (!current?.active)
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Conta desativada",
            });
          if (current.role !== user.role)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Suas permissões foram alteradas. Atualize a sessão.",
            });
          if (key) {
            const [receipt] = await tx
              .select()
              .from(operationReceipts)
              .where(eq(operationReceipts.id, receiptId));
            if (receipt) {
              if (receipt.inputHash !== inputHash)
                throw new TRPCError({
                  code: "CONFLICT",
                  message: "Identificador já utilizado com outro conteúdo",
                });
              return {
                ok: true,
                marker: "middlewareMarker",
                data: superjson.deserialize(
                  (typeof receipt.result === "string"
                    ? JSON.parse(receipt.result)
                    : receipt.result) as ReturnType<typeof superjson.serialize>
                ),
              } as unknown as T;
            }
          }
          const vehicleId = await authorizeOperation(
            tx,
            current,
            path,
            raw,
            true
          );
          // Recheck ownership and assignment after waiting for the vehicle lock.
          await authorizeOperation(tx, current, path, raw);
          if (vehicleId && raw.expectedRevision !== undefined) {
            const [vehicle] = await tx
              .select()
              .from(vehicles)
              .where(eq(vehicles.id, vehicleId));
            if (
              !Number.isInteger(raw.expectedRevision) ||
              raw.expectedRevision !== vehicle.revision
            )
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "O veículo mudou desde a consulta. Atualize os dados antes de alterar.",
              });
          }
          const result = await next(current);
          if (!result.ok) throw result.error;
          if (vehicleId)
            await tx
              .update(vehicles)
              .set({ revision: sql`${vehicles.revision} + 1` })
              .where(eq(vehicles.id, vehicleId));
          await tx.insert(auditLogs).values({
            userId: user.id,
            userName: user.name,
            action: "COMMAND_CONFIRMED",
            entityType: path,
            entityId: vehicleId,
            newData: {
              requestId,
              idempotencyKey: key ?? null,
              result: "confirmed",
            },
          });
          if (!path.startsWith("integration."))
            await tx.insert(domainEvents).values({
              id: randomUUID(),
              userId: user.id,
              requestId: requestId.slice(0, 100),
              operation: path,
              resourceId: vehicleId,
              payload: { version: 1, state: "confirmed" },
            });
          if (key)
            await tx.insert(operationReceipts).values({
              id: receiptId,
              userId: user.id,
              operation: path,
              requestId: requestId.slice(0, 100),
              inputHash,
              result: superjson.serialize(result.data),
            });
          return result;
        }),
      { isolationLevel: "read committed" }
    );
  } catch (error) {
    // Failure records are independent of the rolled back domain transaction. Never store input photos or credentials.
    await db.insert(auditLogs).values({
      userId: user.id,
      userName: user.name,
      action: "COMMAND_REJECTED",
      entityType: path,
      newData: {
        requestId,
        idempotencyKey: key ?? null,
        result: "rejected",
        code: error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
      },
    });
    throw error;
  }
}
