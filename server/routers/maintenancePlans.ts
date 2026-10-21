import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  maintenancePlans,
  vehicleMaintenanceStatus,
  vehicles,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { VEHICLE_TYPES } from "@shared/const";

import { TRPCError } from "@trpc/server";
import { recordKm } from "../domain/odometer";

export const maintenancePlansRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: maintenancePlans.id,
        name: maintenancePlans.name,
        description: maintenancePlans.description,
        vehicleType: maintenancePlans.vehicleType,
        vehicleId: maintenancePlans.vehicleId,
        vehiclePlate: vehicles.plate,
        intervalKm: maintenancePlans.intervalKm,
        intervalDays: maintenancePlans.intervalDays,
        active: maintenancePlans.active,
        createdAt: maintenancePlans.createdAt,
      })
      .from(maintenancePlans)
      .leftJoin(vehicles, eq(maintenancePlans.vehicleId, vehicles.id))
      .orderBy(desc(maintenancePlans.createdAt));

    return result;
  }),

  listActive: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(maintenancePlans)
      .where(eq(maintenancePlans.active, true))
      .orderBy(maintenancePlans.name);

    return result;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [plan] = await db
        .select({
          id: maintenancePlans.id,
          name: maintenancePlans.name,
          description: maintenancePlans.description,
          vehicleType: maintenancePlans.vehicleType,
          vehicleId: maintenancePlans.vehicleId,
          vehiclePlate: vehicles.plate,
          intervalKm: maintenancePlans.intervalKm,
          intervalDays: maintenancePlans.intervalDays,
          active: maintenancePlans.active,
          createdAt: maintenancePlans.createdAt,
          updatedAt: maintenancePlans.updatedAt,
        })
        .from(maintenancePlans)
        .leftJoin(vehicles, eq(maintenancePlans.vehicleId, vehicles.id))
        .where(eq(maintenancePlans.id, input.id))
        .limit(1);

      return plan ?? null;
    }),

  create: gestorProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        description: z.string().optional(),
        vehicleType: z.enum(VEHICLE_TYPES).nullable().optional(),
        vehicleId: z.number().nullable().optional(),
        intervalKm: z.number().int().min(1).optional(),
        intervalDays: z.number().int().min(1).optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // At least one interval must be provided
      if (!input.intervalKm && !input.intervalDays) {
        throw new Error(
          "Pelo menos um intervalo (km ou dias) deve ser informado"
        );
      }

      const result = await db.insert(maintenancePlans).values(input);
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "maintenance_plan",
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
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        vehicleType: z.enum(VEHICLE_TYPES).nullable().optional(),
        vehicleId: z.number().nullable().optional(),
        intervalKm: z.number().int().min(1).nullable().optional(),
        intervalDays: z.number().int().min(1).nullable().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Get previous data
      const [previous] = await db
        .select()
        .from(maintenancePlans)
        .where(eq(maintenancePlans.id, id))
        .limit(1);

      if (!previous)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plano não encontrado",
        });
      const merged = { ...previous, ...updateData };
      if (!merged.intervalKm && !merged.intervalDays)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Defina ao menos um intervalo",
        });
      await db
        .update(maintenancePlans)
        .set(updateData)
        .where(eq(maintenancePlans.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "maintenance_plan",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  delete: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data
      const [previous] = await db
        .select()
        .from(maintenancePlans)
        .where(eq(maintenancePlans.id, input.id))
        .limit(1);

      // Soft delete
      await db
        .update(maintenancePlans)
        .set({ active: false })
        .where(eq(maintenancePlans.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "maintenance_plan",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get maintenance status for a vehicle
  getVehicleStatus: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: vehicleMaintenanceStatus.id,
          vehicleId: vehicleMaintenanceStatus.vehicleId,
          maintenancePlanId: vehicleMaintenanceStatus.maintenancePlanId,
          planName: maintenancePlans.name,
          lastExecutedAt: vehicleMaintenanceStatus.lastExecutedAt,
          lastExecutedKm: vehicleMaintenanceStatus.lastExecutedKm,
          nextDueDate: vehicleMaintenanceStatus.nextDueDate,
          nextDueKm: vehicleMaintenanceStatus.nextDueKm,
          status: vehicleMaintenanceStatus.status,
        })
        .from(vehicleMaintenanceStatus)
        .innerJoin(
          maintenancePlans,
          eq(vehicleMaintenanceStatus.maintenancePlanId, maintenancePlans.id)
        )
        .where(eq(vehicleMaintenanceStatus.vehicleId, input.vehicleId));

      return result;
    }),

  // Get all vehicles with maintenance due/overdue
  getMaintenanceAlerts: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: vehicleMaintenanceStatus.id,
        vehicleId: vehicleMaintenanceStatus.vehicleId,
        vehiclePlate: vehicles.plate,
        vehicleModel: vehicles.model,
        maintenancePlanId: vehicleMaintenanceStatus.maintenancePlanId,
        planName: maintenancePlans.name,
        nextDueDate: vehicleMaintenanceStatus.nextDueDate,
        nextDueKm: vehicleMaintenanceStatus.nextDueKm,
        currentKm: vehicles.currentKm,
        status: vehicleMaintenanceStatus.status,
      })
      .from(vehicleMaintenanceStatus)
      .innerJoin(
        maintenancePlans,
        eq(vehicleMaintenanceStatus.maintenancePlanId, maintenancePlans.id)
      )
      .innerJoin(vehicles, eq(vehicleMaintenanceStatus.vehicleId, vehicles.id))
      .where(and(eq(vehicles.active, true), eq(maintenancePlans.active, true)))
      .orderBy(
        vehicleMaintenanceStatus.status,
        vehicleMaintenanceStatus.nextDueDate
      );

    // Filter to show only a_vencer and vencida
    return result
      .map(r => ({
        ...r,
        status:
          (r.nextDueDate && r.nextDueDate <= new Date()) ||
          (r.nextDueKm !== null && r.currentKm >= r.nextDueKm)
            ? "vencida"
            : r.status,
      }))
      .filter(r => r.status !== "em_dia");
  }),

  // Update maintenance status after service order completion
  recordExecution: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        maintenancePlanId: z.number(),
        executedAt: z.date(),
        executedKm: z.number().int().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the maintenance plan
      const [plan] = await db
        .select()
        .from(maintenancePlans)
        .where(eq(maintenancePlans.id, input.maintenancePlanId))
        .limit(1);

      if (!plan) {
        throw new Error("Plano de manutenção não encontrado");
      }

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId));
      if (
        !vehicle ||
        !plan.active ||
        (plan.vehicleId && plan.vehicleId !== vehicle.id) ||
        (plan.vehicleType && plan.vehicleType !== vehicle.vehicleType)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plano não aplicável ao veículo",
        });
      if (input.executedAt.getTime() > Date.now() + 300000)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Execução no futuro",
        });
      await recordKm(
        db,
        ctx.user,
        vehicle.id,
        input.executedKm,
        "maintenance",
        input.executedAt
      );
      // Calculate next due date and km
      let nextDueDate: Date | null = null;
      let nextDueKm: number | null = null;

      if (plan.intervalDays) {
        nextDueDate = new Date(input.executedAt);
        nextDueDate.setDate(nextDueDate.getDate() + plan.intervalDays);
      }

      if (plan.intervalKm) {
        nextDueKm = input.executedKm + plan.intervalKm;
      }

      // Check if status record exists
      const [existing] = await db
        .select()
        .from(vehicleMaintenanceStatus)
        .where(
          and(
            eq(vehicleMaintenanceStatus.vehicleId, input.vehicleId),
            eq(
              vehicleMaintenanceStatus.maintenancePlanId,
              input.maintenancePlanId
            )
          )
        )
        .limit(1);

      if (
        existing?.lastExecutedAt &&
        input.executedAt < existing.lastExecutedAt
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "Execução anterior à última manutenção registrada",
        });
      if (existing) {
        await db
          .update(vehicleMaintenanceStatus)
          .set({
            lastExecutedAt: input.executedAt,
            lastExecutedKm: input.executedKm,
            nextDueDate,
            nextDueKm,
            status: "em_dia",
          })
          .where(eq(vehicleMaintenanceStatus.id, existing.id));
      } else {
        await db.insert(vehicleMaintenanceStatus).values({
          vehicleId: input.vehicleId,
          maintenancePlanId: input.maintenancePlanId,
          lastExecutedAt: input.executedAt,
          lastExecutedKm: input.executedKm,
          nextDueDate,
          nextDueKm,
          status: "em_dia",
        });
      }

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "vehicle_maintenance_status",
        entityId: input.vehicleId,
        newData: {
          maintenancePlanId: input.maintenancePlanId,
          executedAt: input.executedAt,
          executedKm: input.executedKm,
          nextDueDate,
          nextDueKm,
        },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
