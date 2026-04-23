import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { vehicleFines, vehicles, users } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { FINE_STATUSES } from "@shared/const";

export const vehicleFinesRouter = router({
  listByVehicle: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: vehicleFines.id,
          vehicleId: vehicleFines.vehicleId,
          fineDate: vehicleFines.fineDate,
          dueDate: vehicleFines.dueDate,
          autoInfracao: vehicleFines.autoInfracao,
          infraction: vehicleFines.infraction,
          location: vehicleFines.location,
          amount: vehicleFines.amount,
          discountAmount: vehicleFines.discountAmount,
          points: vehicleFines.points,
          status: vehicleFines.status,
          responsibleDriverId: vehicleFines.responsibleDriverId,
          driverName: users.name,
          paidAt: vehicleFines.paidAt,
          paidAmount: vehicleFines.paidAmount,
          receiptUrl: vehicleFines.receiptUrl,
          observations: vehicleFines.observations,
          registeredById: vehicleFines.registeredById,
          createdAt: vehicleFines.createdAt,
        })
        .from(vehicleFines)
        .leftJoin(users, eq(vehicleFines.responsibleDriverId, users.id))
        .where(eq(vehicleFines.vehicleId, input.vehicleId))
        .orderBy(desc(vehicleFines.fineDate));

      return result;
    }),

  listAll: gestorProcedure
    .input(
      z.object({
        status: z.enum(FINE_STATUSES).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input?.status) {
        conditions.push(eq(vehicleFines.status, input.status));
      }

      const result = await db
        .select({
          id: vehicleFines.id,
          vehicleId: vehicleFines.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          fineDate: vehicleFines.fineDate,
          dueDate: vehicleFines.dueDate,
          autoInfracao: vehicleFines.autoInfracao,
          infraction: vehicleFines.infraction,
          amount: vehicleFines.amount,
          points: vehicleFines.points,
          status: vehicleFines.status,
          driverName: users.name,
          createdAt: vehicleFines.createdAt,
        })
        .from(vehicleFines)
        .innerJoin(vehicles, eq(vehicleFines.vehicleId, vehicles.id))
        .leftJoin(users, eq(vehicleFines.responsibleDriverId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(vehicleFines.fineDate));

      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db
        .select()
        .from(vehicleFines)
        .where(eq(vehicleFines.id, input.id))
        .limit(1);

      return result ?? null;
    }),

  create: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        fineDate: z.date(),
        dueDate: z.date().optional(),
        autoInfracao: z.string().optional(),
        infraction: z.string().min(1, "Descrição da infração é obrigatória"),
        location: z.string().optional(),
        amount: z.number().min(0),
        discountAmount: z.number().optional(),
        points: z.number().int().min(0).optional(),
        responsibleDriverId: z.number().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(vehicleFines).values({
        vehicleId: input.vehicleId,
        fineDate: input.fineDate,
        dueDate: input.dueDate,
        autoInfracao: input.autoInfracao,
        infraction: input.infraction,
        location: input.location,
        amount: String(input.amount),
        discountAmount: input.discountAmount ? String(input.discountAmount) : undefined,
        points: input.points,
        status: "pendente",
        responsibleDriverId: input.responsibleDriverId,
        observations: input.observations,
        registeredById: ctx.user.id,
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "vehicle_fine",
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
        vehicleId: z.number().optional(),
        fineDate: z.date().optional(),
        dueDate: z.date().nullable().optional(),
        autoInfracao: z.string().nullable().optional(),
        infraction: z.string().min(1).optional(),
        location: z.string().nullable().optional(),
        amount: z.number().min(0).optional(),
        discountAmount: z.number().nullable().optional(),
        points: z.number().int().min(0).nullable().optional(),
        status: z.enum(FINE_STATUSES).optional(),
        responsibleDriverId: z.number().nullable().optional(),
        paidAt: z.date().nullable().optional(),
        paidAmount: z.number().nullable().optional(),
        receiptUrl: z.string().nullable().optional(),
        observations: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateFields } = input;

      const [previous] = await db
        .select()
        .from(vehicleFines)
        .where(eq(vehicleFines.id, id))
        .limit(1);

      if (!previous) throw new Error("Multa não encontrada");

      const setData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updateFields)) {
        if (value === undefined) continue; // skip undefined (not sent)
        if (key === "amount" || key === "discountAmount" || key === "paidAmount") {
          setData[key] = value !== null ? String(value) : null;
        } else {
          setData[key] = value;
        }
      }

      if (Object.keys(setData).length === 0) {
        return { success: true };
      }

      await db
        .update(vehicleFines)
        .set(setData)
        .where(eq(vehicleFines.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "vehicle_fine",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: setData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  softDelete: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [previous] = await db
        .select()
        .from(vehicleFines)
        .where(eq(vehicleFines.id, input.id))
        .limit(1);

      if (!previous) throw new Error("Multa n\u00e3o encontrada");

      // Soft delete: marca como cancelada em vez de deletar fisicamente
      await db
        .update(vehicleFines)
        .set({ status: "cancelada" })
        .where(eq(vehicleFines.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "vehicle_fine",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        newData: { status: "cancelada", deletedBy: ctx.user.id, deletedAt: new Date().toISOString() } as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Stats for dashboard
  stats: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allFines = await db
      .select({
        status: vehicleFines.status,
        amount: vehicleFines.amount,
      })
      .from(vehicleFines);

    const pendentes = allFines.filter((f) => f.status === "pendente");
    const pagas = allFines.filter((f) => f.status === "paga");

    const totalPendente = pendentes.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalPago = pagas.reduce((sum, f) => sum + Number(f.amount || 0), 0);

    return {
      total: allFines.length,
      pendentes: pendentes.length,
      pagas: pagas.length,
      totalPendente,
      totalPago,
    };
  }),
});
