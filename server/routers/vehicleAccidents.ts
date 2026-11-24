import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { vehicleAccidents, vehicles, users } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { ACCIDENT_STATUSES } from "@shared/const";

export const vehicleAccidentsRouter = router({
  listByVehicle: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return db
        .select({
          id: vehicleAccidents.id,
          vehicleId: vehicleAccidents.vehicleId,
          accidentDate: vehicleAccidents.accidentDate,
          location: vehicleAccidents.location,
          description: vehicleAccidents.description,
          severity: vehicleAccidents.severity,
          status: vehicleAccidents.status,
          driverId: vehicleAccidents.driverId,
          driverName: users.name,
          thirdPartyInvolved: vehicleAccidents.thirdPartyInvolved,
          insuranceClaimNumber: vehicleAccidents.insuranceClaimNumber,
          estimatedCost: vehicleAccidents.estimatedCost,
          finalCost: vehicleAccidents.finalCost,
          createdAt: vehicleAccidents.createdAt,
        })
        .from(vehicleAccidents)
        .leftJoin(users, eq(vehicleAccidents.driverId, users.id))
        .where(
          and(
            eq(vehicleAccidents.vehicleId, input.vehicleId),
            eq(vehicleAccidents.isDeleted, false)
          )
        )
        .orderBy(desc(vehicleAccidents.accidentDate));
    }),

  listAll: gestorProcedure
    .input(
      z
        .object({ status: z.enum(ACCIDENT_STATUSES).optional() })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(vehicleAccidents.isDeleted, false)];
      if (input?.status) {
        conditions.push(eq(vehicleAccidents.status, input.status));
      }

      return db
        .select({
          id: vehicleAccidents.id,
          vehicleId: vehicleAccidents.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          fleetNumber: vehicles.fleetNumber,
          accidentDate: vehicleAccidents.accidentDate,
          location: vehicleAccidents.location,
          description: vehicleAccidents.description,
          severity: vehicleAccidents.severity,
          status: vehicleAccidents.status,
          driverName: users.name,
          thirdPartyInvolved: vehicleAccidents.thirdPartyInvolved,
          insuranceClaimNumber: vehicleAccidents.insuranceClaimNumber,
          estimatedCost: vehicleAccidents.estimatedCost,
          finalCost: vehicleAccidents.finalCost,
          createdAt: vehicleAccidents.createdAt,
        })
        .from(vehicleAccidents)
        .innerJoin(vehicles, eq(vehicleAccidents.vehicleId, vehicles.id))
        .leftJoin(users, eq(vehicleAccidents.driverId, users.id))
        .where(and(...conditions))
        .orderBy(desc(vehicleAccidents.accidentDate));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db
        .select()
        .from(vehicleAccidents)
        .where(eq(vehicleAccidents.id, input.id))
        .limit(1);

      return result ?? null;
    }),

  create: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        accidentDate: z.date(),
        location: z.string().optional(),
        description: z.string().min(1, "Descrição é obrigatória"),
        severity: z.enum(["baixa", "media", "alta"]).default("media"),
        status: z.enum(ACCIDENT_STATUSES).default("aberto"),
        driverId: z.number().optional(),
        thirdPartyInvolved: z.boolean().default(false),
        thirdPartyDetails: z.string().optional(),
        insuranceClaimNumber: z.string().optional(),
        estimatedCost: z.number().min(0).optional(),
        finalCost: z.number().min(0).optional(),
        kmAtAccident: z.number().int().min(0).optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(vehicleAccidents).values({
        vehicleId: input.vehicleId,
        accidentDate: input.accidentDate,
        location: input.location,
        description: input.description,
        severity: input.severity,
        status: input.status,
        driverId: input.driverId,
        thirdPartyInvolved: input.thirdPartyInvolved,
        thirdPartyDetails: input.thirdPartyDetails,
        insuranceClaimNumber: input.insuranceClaimNumber,
        estimatedCost:
          input.estimatedCost !== undefined
            ? String(input.estimatedCost)
            : undefined,
        finalCost:
          input.finalCost !== undefined ? String(input.finalCost) : undefined,
        kmAtAccident: input.kmAtAccident,
        observations: input.observations,
        registeredById: ctx.user.id,
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "vehicle_accident",
        entityId: insertId,
        newData: input as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId };
    }),

  update: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        accidentDate: z.date().optional(),
        location: z.string().nullable().optional(),
        description: z.string().min(1).optional(),
        severity: z.enum(["baixa", "media", "alta"]).optional(),
        status: z.enum(ACCIDENT_STATUSES).optional(),
        driverId: z.number().nullable().optional(),
        thirdPartyInvolved: z.boolean().optional(),
        thirdPartyDetails: z.string().nullable().optional(),
        insuranceClaimNumber: z.string().nullable().optional(),
        estimatedCost: z.number().min(0).nullable().optional(),
        finalCost: z.number().min(0).nullable().optional(),
        kmAtAccident: z.number().int().min(0).nullable().optional(),
        observations: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...fields } = input;

      const [previous] = await db
        .select()
        .from(vehicleAccidents)
        .where(eq(vehicleAccidents.id, id))
        .limit(1);
      if (!previous) throw new Error("Sinistro não encontrado");

      const setData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        if (key === "estimatedCost" || key === "finalCost") {
          setData[key] = value !== null ? String(value) : null;
        } else {
          setData[key] = value;
        }
      }
      // Marca encerramento
      if (
        setData.status === "encerrado" &&
        previous.status !== "encerrado" &&
        setData.closedAt === undefined
      ) {
        setData.closedAt = new Date();
      }

      if (Object.keys(setData).length === 0) return { success: true };

      await db
        .update(vehicleAccidents)
        .set(setData)
        .where(eq(vehicleAccidents.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "vehicle_accident",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: setData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  delete: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [previous] = await db
        .select()
        .from(vehicleAccidents)
        .where(eq(vehicleAccidents.id, input.id))
        .limit(1);
      if (!previous) throw new Error("Sinistro não encontrado");
      if (previous.isDeleted) throw new Error("Sinistro já foi excluído");

      await db
        .update(vehicleAccidents)
        .set({
          isDeleted: true,
          deletedById: ctx.user.id,
          deletedAt: new Date(),
        })
        .where(eq(vehicleAccidents.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "vehicle_accident",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
