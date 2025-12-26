import { z } from "zod";
import { eq, desc, and, or, gte, lte, ne, sql } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  reservations,
  vehicles,
  users,
  projects,
  checklists,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { RESERVATION_STATUSES } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export const reservationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().optional(),
        userId: z.number().optional(),
        projectId: z.number().optional(),
        status: z.enum(RESERVATION_STATUSES).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Non-admin users can only see their own reservations unless they have permission
      if (ctx.user.role === "motorista") {
        conditions.push(eq(reservations.userId, ctx.user.id));
      }

      if (input?.vehicleId) {
        conditions.push(eq(reservations.vehicleId, input.vehicleId));
      }
      if (input?.userId) {
        conditions.push(eq(reservations.userId, input.userId));
      }
      if (input?.projectId) {
        conditions.push(eq(reservations.projectId, input.projectId));
      }
      if (input?.status) {
        conditions.push(eq(reservations.status, input.status));
      }
      if (input?.startDate) {
        conditions.push(gte(reservations.startDate, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(reservations.endDate, input.endDate));
      }

      const result = await db
        .select({
          id: reservations.id,
          vehicleId: reservations.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          userId: reservations.userId,
          userName: users.name,
          projectId: reservations.projectId,
          projectName: projects.name,
          purpose: reservations.purpose,
          location: reservations.location,
          startDate: reservations.startDate,
          endDate: reservations.endDate,
          status: reservations.status,
          checkInAt: reservations.checkInAt,
          checkInKm: reservations.checkInKm,
          checkOutAt: reservations.checkOutAt,
          checkOutKm: reservations.checkOutKm,
          checklistId: reservations.checklistId,
          createdAt: reservations.createdAt,
        })
        .from(reservations)
        .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
        .innerJoin(users, eq(reservations.userId, users.id))
        .innerJoin(projects, eq(reservations.projectId, projects.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(reservations.startDate));

      return result;
    }),

  // Get reservations for calendar view
  listForCalendar: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        vehicleId: z.number().optional(),
        unitId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        or(
          and(
            gte(reservations.startDate, input.startDate),
            lte(reservations.startDate, input.endDate)
          ),
          and(
            gte(reservations.endDate, input.startDate),
            lte(reservations.endDate, input.endDate)
          ),
          and(
            lte(reservations.startDate, input.startDate),
            gte(reservations.endDate, input.endDate)
          )
        )!,
        ne(reservations.status, "cancelada"),
      ];

      if (input.vehicleId) {
        conditions.push(eq(reservations.vehicleId, input.vehicleId));
      }
      if (input.unitId) {
        conditions.push(eq(vehicles.unitId, input.unitId));
      }

      const result = await db
        .select({
          id: reservations.id,
          vehicleId: reservations.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          userId: reservations.userId,
          userName: users.name,
          projectName: projects.name,
          startDate: reservations.startDate,
          endDate: reservations.endDate,
          status: reservations.status,
        })
        .from(reservations)
        .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
        .innerJoin(users, eq(reservations.userId, users.id))
        .innerJoin(projects, eq(reservations.projectId, projects.id))
        .where(and(...conditions));

      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: reservations.id,
          vehicleId: reservations.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          vehicleCurrentKm: vehicles.currentKm,
          userId: reservations.userId,
          userName: users.name,
          projectId: reservations.projectId,
          projectName: projects.name,
          purpose: reservations.purpose,
          location: reservations.location,
          startDate: reservations.startDate,
          endDate: reservations.endDate,
          status: reservations.status,
          checkInAt: reservations.checkInAt,
          checkInKm: reservations.checkInKm,
          checkInCondition: reservations.checkInCondition,
          checkInPhotoUrl: reservations.checkInPhotoUrl,
          checkOutAt: reservations.checkOutAt,
          checkOutKm: reservations.checkOutKm,
          checkOutCondition: reservations.checkOutCondition,
          checkOutPhotoUrl: reservations.checkOutPhotoUrl,
          checklistId: reservations.checklistId,
          observations: reservations.observations,
          createdAt: reservations.createdAt,
          updatedAt: reservations.updatedAt,
        })
        .from(reservations)
        .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
        .innerJoin(users, eq(reservations.userId, users.id))
        .innerJoin(projects, eq(reservations.projectId, projects.id))
        .where(eq(reservations.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  // Check for conflicts
  checkConflict: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
        excludeId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(reservations.vehicleId, input.vehicleId),
        ne(reservations.status, "cancelada"),
        or(
          and(
            lte(reservations.startDate, input.startDate),
            gte(reservations.endDate, input.startDate)
          ),
          and(
            lte(reservations.startDate, input.endDate),
            gte(reservations.endDate, input.endDate)
          ),
          and(
            gte(reservations.startDate, input.startDate),
            lte(reservations.endDate, input.endDate)
          )
        )!,
      ];

      if (input.excludeId) {
        conditions.push(ne(reservations.id, input.excludeId));
      }

      const conflicts = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(and(...conditions))
        .limit(1);

      return { hasConflict: conflicts.length > 0 };
    }),

  create: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        projectId: z.number(),
        purpose: z.string().optional(),
        location: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if vehicle is available
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId))
        .limit(1);

      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      }

      if (vehicle.status !== "ativo") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Veículo não está disponível para reserva",
        });
      }

      // Check for conflicts
      const conflicts = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.vehicleId, input.vehicleId),
            ne(reservations.status, "cancelada"),
            or(
              and(
                lte(reservations.startDate, input.startDate),
                gte(reservations.endDate, input.startDate)
              ),
              and(
                lte(reservations.startDate, input.endDate),
                gte(reservations.endDate, input.endDate)
              ),
              and(
                gte(reservations.startDate, input.startDate),
                lte(reservations.endDate, input.endDate)
              )
            )!
          )
        )
        .limit(1);

      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma reserva para este veículo no período selecionado",
        });
      }

      const result = await db.insert(reservations).values({
        ...input,
        userId: ctx.user.id,
        status: "agendada",
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "RESERVATION_CREATE",
        entityType: "reservation",
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
        projectId: z.number().optional(),
        purpose: z.string().optional(),
        location: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Get previous data
      const [previous] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, id))
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reserva não encontrada",
        });
      }

      // Check for conflicts if dates are being changed
      if (updateData.startDate || updateData.endDate) {
        const startDate = updateData.startDate ?? previous.startDate;
        const endDate = updateData.endDate ?? previous.endDate;

        const conflicts = await db
          .select({ id: reservations.id })
          .from(reservations)
          .where(
            and(
              eq(reservations.vehicleId, previous.vehicleId),
              ne(reservations.id, id),
              ne(reservations.status, "cancelada"),
              or(
                and(
                  lte(reservations.startDate, startDate),
                  gte(reservations.endDate, startDate)
                ),
                and(
                  lte(reservations.startDate, endDate),
                  gte(reservations.endDate, endDate)
                ),
                and(
                  gte(reservations.startDate, startDate),
                  lte(reservations.endDate, endDate)
                )
              )!
            )
          )
          .limit(1);

        if (conflicts.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe uma reserva para este veículo no período selecionado",
          });
        }
      }

      await db.update(reservations).set(updateData).where(eq(reservations.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "reservation",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data
      const [previous] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.id))
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reserva não encontrada",
        });
      }

      // Only owner or gestor can cancel
      if (
        previous.userId !== ctx.user.id &&
        !["admin", "gestor_frota"].includes(ctx.user.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para cancelar esta reserva",
        });
      }

      if (previous.status === "em_uso") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível cancelar uma reserva em uso",
        });
      }

      await db
        .update(reservations)
        .set({
          status: "cancelada",
          observations: input.reason
            ? `${previous.observations ?? ""}\nCancelamento: ${input.reason}`.trim()
            : previous.observations,
        })
        .where(eq(reservations.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "RESERVATION_CANCEL",
        entityType: "reservation",
        entityId: input.id,
        previousData: { status: previous.status },
        newData: { status: "cancelada", reason: input.reason },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Check-in
  checkIn: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        km: z.number().min(0),
        condition: z.string().optional(),
        photoData: z.string().optional(), // Base64
        photoFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get reservation
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.id))
        .limit(1);

      if (!reservation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reserva não encontrada",
        });
      }

      // Only owner can check-in
      if (reservation.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o responsável pela reserva pode fazer check-in",
        });
      }

      if (reservation.status !== "agendada") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Check-in já foi realizado ou reserva não está agendada",
        });
      }

      // Check if checklist was completed today for this vehicle/user
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayChecklist = await db
        .select({ id: checklists.id })
        .from(checklists)
        .where(
          and(
            eq(checklists.vehicleId, reservation.vehicleId),
            eq(checklists.userId, ctx.user.id),
            gte(checklists.executedAt, today),
            lte(checklists.executedAt, tomorrow)
          )
        )
        .limit(1);

      if (todayChecklist.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "É necessário completar o checklist diário antes do check-in",
        });
      }

      let photoUrl: string | undefined;
      if (input.photoData && input.photoFileName) {
        const buffer = Buffer.from(input.photoData, "base64");
        const key = `reservations/${input.id}/checkin-${Date.now()}-${input.photoFileName}`;
        const uploadResult = await storagePut(key, buffer, "image/jpeg");
        photoUrl = uploadResult.url;
      }

      await db
        .update(reservations)
        .set({
          status: "em_uso",
          checkInAt: new Date(),
          checkInKm: input.km,
          checkInCondition: input.condition,
          checkInPhotoUrl: photoUrl,
          checklistId: todayChecklist[0].id,
        })
        .where(eq(reservations.id, input.id));

      // Update vehicle current responsible
      await db
        .update(vehicles)
        .set({ currentResponsibleId: ctx.user.id })
        .where(eq(vehicles.id, reservation.vehicleId));

      await createAuditLog({
        user: ctx.user,
        action: "CHECK_IN",
        entityType: "reservation",
        entityId: input.id,
        newData: {
          km: input.km,
          condition: input.condition,
          vehicleId: reservation.vehicleId,
        },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Check-out
  checkOut: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        km: z.number().min(0),
        condition: z.string().optional(),
        photoData: z.string().optional(), // Base64
        photoFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get reservation
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.id))
        .limit(1);

      if (!reservation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reserva não encontrada",
        });
      }

      // Only owner can check-out
      if (reservation.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o responsável pela reserva pode fazer check-out",
        });
      }

      if (reservation.status !== "em_uso") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Check-in não foi realizado ou reserva já foi concluída",
        });
      }

      // Validate km
      if (reservation.checkInKm && input.km < reservation.checkInKm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Km final deve ser maior ou igual ao km inicial",
        });
      }

      let photoUrl: string | undefined;
      if (input.photoData && input.photoFileName) {
        const buffer = Buffer.from(input.photoData, "base64");
        const key = `reservations/${input.id}/checkout-${Date.now()}-${input.photoFileName}`;
        const uploadResult = await storagePut(key, buffer, "image/jpeg");
        photoUrl = uploadResult.url;
      }

      await db
        .update(reservations)
        .set({
          status: "concluida",
          checkOutAt: new Date(),
          checkOutKm: input.km,
          checkOutCondition: input.condition,
          checkOutPhotoUrl: photoUrl,
        })
        .where(eq(reservations.id, input.id));

      // Update vehicle km and clear responsible
      await db
        .update(vehicles)
        .set({
          currentKm: input.km,
          currentResponsibleId: null,
        })
        .where(eq(vehicles.id, reservation.vehicleId));

      await createAuditLog({
        user: ctx.user,
        action: "CHECK_OUT",
        entityType: "reservation",
        entityId: input.id,
        newData: {
          km: input.km,
          condition: input.condition,
          vehicleId: reservation.vehicleId,
          kmRodados: input.km - (reservation.checkInKm ?? 0),
        },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get my active reservations
  myActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: reservations.id,
        vehicleId: reservations.vehicleId,
        vehiclePlate: vehicles.plate,
        vehicleModel: vehicles.model,
        projectName: projects.name,
        startDate: reservations.startDate,
        endDate: reservations.endDate,
        status: reservations.status,
        checkInAt: reservations.checkInAt,
        checkInKm: reservations.checkInKm,
      })
      .from(reservations)
      .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
      .innerJoin(projects, eq(reservations.projectId, projects.id))
      .where(
        and(
          eq(reservations.userId, ctx.user.id),
          or(
            eq(reservations.status, "agendada"),
            eq(reservations.status, "em_uso")
          )
        )
      )
      .orderBy(reservations.startDate);

    return result;
  }),
});
