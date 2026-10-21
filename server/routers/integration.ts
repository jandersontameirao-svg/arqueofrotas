import { z } from "zod";
import { createHash } from "node:crypto";
import { eq, and, gt, notExists, sql, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  gestorProcedure,
  adminProcedure,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  operationReceipts,
  domainEvents,
  integrationReferences,
  eventAcknowledgements,
  auditLogs,
} from "../../drizzle/schema";
const jsonValue = (value: unknown) =>
  typeof value === "string" ? JSON.parse(value) : value;
export const integrationRouter = router({
  operationStatus: protectedProcedure
    .input(
      z.object({
        operation: z.string().max(100),
        idempotencyKey: z.string().min(8).max(100),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const id = createHash("sha256")
        .update(`${ctx.user.id}:${input.operation}:${input.idempotencyKey}`)
        .digest("hex");
      const [receipt] = await db
        .select()
        .from(operationReceipts)
        .where(
          and(
            eq(operationReceipts.id, id),
            eq(operationReceipts.userId, ctx.user.id)
          )
        );
      if (receipt)
        return {
          status: "confirmed" as const,
          requestId: receipt.requestId,
          result: jsonValue(receipt.result),
          receivedAt: receipt.receivedAt,
        };
      const [failure] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, ctx.user.id),
            eq(auditLogs.entityType, input.operation),
            eq(auditLogs.action, "COMMAND_REJECTED"),
            sql`JSON_UNQUOTE(JSON_EXTRACT(${auditLogs.newData}, '$.idempotencyKey')) = ${input.idempotencyKey}`
          )
        )
        .orderBy(desc(auditLogs.id))
        .limit(1);
      return failure
        ? {
            status: "rejected" as const,
            error: jsonValue(failure.newData),
            receivedAt: failure.createdAt,
          }
        : { status: "not_confirmed" as const };
    }),
  events: gestorProcedure
    .input(
      z.object({
        consumer: z.string().min(1).max(100),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(domainEvents)
        .where(
          notExists(
            db
              .select({ one: sql`1` })
              .from(eventAcknowledgements)
              .where(
                and(
                  eq(eventAcknowledgements.userId, ctx.user.id),
                  eq(eventAcknowledgements.consumer, input.consumer),
                  eq(eventAcknowledgements.eventId, domainEvents.id)
                )
              )
          )
        )
        .orderBy(domainEvents.createdAt, domainEvents.id)
        .limit(input.limit);
    }),
  acknowledgeEvent: gestorProcedure
    .input(
      z.object({
        consumer: z.string().min(1).max(100),
        eventId: z.string().min(1).max(64),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [event] = await db
        .select()
        .from(domainEvents)
        .where(eq(domainEvents.id, input.eventId));
      if (!event) throw new TRPCError({ code: "NOT_FOUND" });
      const id = createHash("sha256")
        .update(`${ctx.user.id}:${input.consumer}:${input.eventId}`)
        .digest("hex");
      await db
        .insert(eventAcknowledgements)
        .values({
          id,
          userId: ctx.user.id,
          consumer: input.consumer,
          eventId: input.eventId,
        })
        .onDuplicateKeyUpdate({ set: { eventId: input.eventId } });
      return { acknowledged: true as const };
    }),
  references: gestorProcedure
    .input(z.object({ system: z.string().max(100).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(integrationReferences)
        .where(
          input.system
            ? eq(integrationReferences.system, input.system)
            : undefined
        );
    }),
  mapReference: adminProcedure
    .input(
      z.object({
        system: z.enum([
          "portfolios-projetos",
          "fornecedores",
          "financeiro",
          "ativos",
          "repositorio-central",
        ]),
        entityType: z.string().min(1).max(50),
        localId: z.string().min(1).max(100),
        externalId: z.string().min(1).max(255),
        version: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db
        .select()
        .from(integrationReferences)
        .where(
          and(
            eq(integrationReferences.system, input.system),
            eq(integrationReferences.entityType, input.entityType),
            eq(integrationReferences.localId, input.localId)
          )
        );
      if (existing) {
        if (existing.externalId !== input.externalId)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Correspondência já definida. Revise o plano de migração antes de substituir.",
          });
        return { id: existing.id };
      }
      const result = await db.insert(integrationReferences).values(input);
      return { id: result[0].insertId };
    }),
});
