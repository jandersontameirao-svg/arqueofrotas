import { z } from "zod";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import {
  router,
  gestorProcedure,
  protectedProcedure,
  permissionProcedure,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  vehicles,
  units,
  projects,
  users,
  vehicleDocuments,
  vehicleHolds,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { VEHICLE_TYPES, VEHICLE_STATUSES } from "@shared/const";
import { TRPCError } from "@trpc/server";

import {
  vehicleEligibility,
  validateInterval,
  reconcileVehicle,
} from "../domain/eligibility";
import { recordKm } from "../domain/odometer";

export const vehiclesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(VEHICLE_STATUSES).optional(),
          unitId: z.number().optional(),
          vehicleType: z.enum(VEHICLE_TYPES).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(vehicles.active, true)];

      if (input?.status) {
        conditions.push(eq(vehicles.status, input.status));
      }
      if (input?.unitId) {
        conditions.push(eq(vehicles.unitId, input.unitId));
      }
      if (input?.vehicleType) {
        conditions.push(eq(vehicles.vehicleType, input.vehicleType));
      }
      if (input?.search) {
        conditions.push(
          or(
            like(vehicles.plate, `%${input.search}%`),
            like(vehicles.model, `%${input.search}%`),
            like(vehicles.brand, `%${input.search}%`)
          )!
        );
      }

      const result = await db
        .select({
          id: vehicles.id,
          plate: vehicles.plate,
          model: vehicles.model,
          brand: vehicles.brand,
          year: vehicles.year,
          color: vehicles.color,
          vehicleType: vehicles.vehicleType,
          status: vehicles.status,
          unitId: vehicles.unitId,
          unitName: units.name,
          revision: vehicles.revision,
          currentKm: vehicles.currentKm,
          currentResponsibleId: vehicles.currentResponsibleId,
          currentResponsibleName: users.name,
          trackingDeviceId: vehicles.trackingDeviceId,
          createdAt: vehicles.createdAt,
        })
        .from(vehicles)
        .leftJoin(units, eq(vehicles.unitId, units.id))
        .leftJoin(users, eq(vehicles.currentResponsibleId, users.id))
        .where(and(...conditions))
        .orderBy(vehicles.plate);

      return result;
    }),

  listAvailable: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        unitId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      validateInterval(input.startDate, input.endDate);
      // Get vehicles that are active and not in maintenance/baixado
      const conditions = [
        eq(vehicles.active, true),
        eq(vehicles.status, "ativo"),
      ];

      if (input.unitId) {
        conditions.push(eq(vehicles.unitId, input.unitId));
      }

      const result = await db
        .select({
          id: vehicles.id,
          plate: vehicles.plate,
          model: vehicles.model,
          brand: vehicles.brand,
          vehicleType: vehicles.vehicleType,
          unitId: vehicles.unitId,
          unitName: units.name,
          revision: vehicles.revision,
          currentKm: vehicles.currentKm,
        })
        .from(vehicles)
        .leftJoin(units, eq(vehicles.unitId, units.id))
        .where(and(...conditions))
        .orderBy(vehicles.plate);

      const availability = await Promise.all(
        result.map(async vehicle => ({
          vehicle,
          state: await vehicleEligibility(
            db,
            vehicle.id,
            input.startDate,
            input.endDate
          ),
        }))
      );
      return availability
        .filter(entry => entry.state.eligible)
        .map(entry => entry.vehicle);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: vehicles.id,
          plate: vehicles.plate,
          model: vehicles.model,
          brand: vehicles.brand,
          year: vehicles.year,
          color: vehicles.color,
          vehicleType: vehicles.vehicleType,
          status: vehicles.status,
          unitId: vehicles.unitId,
          unitName: units.name,
          defaultProjectId: vehicles.defaultProjectId,
          defaultProjectName: projects.name,
          currentResponsibleId: vehicles.currentResponsibleId,
          currentResponsibleName: users.name,
          revision: vehicles.revision,
          currentKm: vehicles.currentKm,
          chassi: vehicles.chassi,
          renavam: vehicles.renavam,
          trackingDeviceId: vehicles.trackingDeviceId,
          observations: vehicles.observations,
          active: vehicles.active,
          createdAt: vehicles.createdAt,
          updatedAt: vehicles.updatedAt,
        })
        .from(vehicles)
        .leftJoin(units, eq(vehicles.unitId, units.id))
        .leftJoin(projects, eq(vehicles.defaultProjectId, projects.id))
        .leftJoin(users, eq(vehicles.currentResponsibleId, users.id))
        .where(eq(vehicles.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  create: gestorProcedure
    .input(
      z.object({
        statusReason: z.string().trim().min(3).max(1000).optional(),
        plate: z.string().min(1, "Placa é obrigatória").max(10),
        model: z.string().min(1, "Modelo é obrigatório"),
        brand: z.string().optional(),
        year: z
          .number()
          .min(1900)
          .max(new Date().getFullYear() + 1),
        color: z.string().optional(),
        vehicleType: z.enum(VEHICLE_TYPES),
        status: z.enum(VEHICLE_STATUSES).default("ativo"),
        unitId: z.number().optional(),
        defaultProjectId: z.number().optional(),
        currentResponsibleId: z.number().optional(),
        currentKm: z.number().min(0).default(0),
        chassi: z.string().optional(),
        renavam: z.string().optional(),
        trackingDeviceId: z.string().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if plate already exists
      const existing = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.plate, input.plate.toUpperCase()))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um veículo com esta placa",
        });
      }

      const { statusReason, ...values } = input;
      if (input.status !== "ativo" && !statusReason)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe o motivo da situação inicial",
        });
      const result = await db.insert(vehicles).values({
        ...values,
        plate: input.plate.toUpperCase(),
      });
      const insertId = result[0].insertId;
      if (input.status !== "ativo")
        await db
          .insert(vehicleHolds)
          .values({
            vehicleId: insertId,
            userId: ctx.user.id,
            reason: statusReason!,
          });

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "vehicle",
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
        statusReason: z.string().trim().min(3).max(1000).optional(),
        plate: z.string().min(1).max(10).optional(),
        model: z.string().min(1).optional(),
        brand: z.string().optional(),
        year: z
          .number()
          .min(1900)
          .max(new Date().getFullYear() + 1)
          .optional(),
        color: z.string().optional(),
        vehicleType: z.enum(VEHICLE_TYPES).optional(),
        status: z.enum(VEHICLE_STATUSES).optional(),
        unitId: z.number().nullable().optional(),
        defaultProjectId: z.number().nullable().optional(),
        currentResponsibleId: z.number().nullable().optional(),
        chassi: z.string().optional(),
        renavam: z.string().optional(),
        trackingDeviceId: z.string().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, statusReason, ...updateData } = input;

      // If updating plate, check for duplicates
      if (updateData.plate) {
        const existing = await db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.plate, updateData.plate.toUpperCase()),
              sql`${vehicles.id} != ${id}`
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um veículo com esta placa",
          });
        }
        updateData.plate = updateData.plate.toUpperCase();
      }

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, id))
        .limit(1);

      if (!previous)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      if (updateData.status && updateData.status !== previous.status) {
        if (!statusReason)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe o motivo da mudança de situação",
          });
        if (updateData.status === "ativo") {
          const state = await vehicleEligibility(
            db,
            id,
            undefined,
            undefined,
            undefined,
            true
          );
          if (
            state.reasons.some(reason =>
              ["ocorrencia_critica", "ordem_servico", "em_uso"].includes(reason)
            )
          )
            throw new TRPCError({
              code: "CONFLICT",
              message: "Existem restrições impeditivas abertas",
            });
          await db
            .update(vehicleHolds)
            .set({
              active: false,
              releasedAt: new Date(),
              releasedById: ctx.user.id,
            })
            .where(
              and(eq(vehicleHolds.vehicleId, id), eq(vehicleHolds.active, true))
            );
        } else {
          await db
            .insert(vehicleHolds)
            .values({
              vehicleId: id,
              userId: ctx.user.id,
              reason: statusReason,
            });
        }
      }
      await db.update(vehicles).set(updateData).where(eq(vehicles.id, id));

      // If status changed, log it specifically
      if (updateData.status && previous.status !== updateData.status) {
        await createAuditLog({
          user: ctx.user,
          action: "STATUS_CHANGE",
          entityType: "vehicle",
          entityId: id,
          previousData: { status: previous.status },
          newData: { status: updateData.status, reason: statusReason },
          ...getRequestInfo(ctx.req),
        });
      } else {
        await createAuditLog({
          user: ctx.user,
          action: "UPDATE",
          entityType: "vehicle",
          entityId: id,
          previousData: previous as Record<string, unknown>,
          newData: updateData as Record<string, unknown>,
          ...getRequestInfo(ctx.req),
        });
      }

      return { success: true };
    }),

  // Adjust KM (requires special permission)
  adjustKm: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        newKm: z.number().min(0),
        reason: z.string().trim().min(3, "Motivo é obrigatório"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.id))
        .limit(1);

      await recordKm(
        db,
        ctx.user,
        input.id,
        input.newKm,
        "correction",
        new Date(),
        input.reason
      );

      await createAuditLog({
        user: ctx.user,
        action: "KM_ADJUST",
        entityType: "vehicle",
        entityId: input.id,
        previousData: { currentKm: previous.currentKm },
        newData: { currentKm: input.newKm, reason: input.reason },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Soft delete (requires admin)
  delete: permissionProcedure("canDeleteVehicle")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.id))
        .limit(1);

      await db
        .update(vehicles)
        .set({ active: false })
        .where(eq(vehicles.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "vehicle",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get vehicle statistics for dashboard
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allVehicles = await db
      .select({
        status: vehicles.status,
      })
      .from(vehicles)
      .where(eq(vehicles.active, true));

    const total = allVehicles.length;
    const ativos = allVehicles.filter(v => v.status === "ativo").length;
    const emManutencao = allVehicles.filter(
      v => v.status === "manutencao"
    ).length;
    const baixados = allVehicles.filter(v => v.status === "baixado").length;

    return {
      total,
      ativos,
      emManutencao,
      baixados,
      disponibilidade: total > 0 ? Math.round((ativos / total) * 100) : 0,
    };
  }),
});
