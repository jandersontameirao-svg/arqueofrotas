import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { serviceProviders } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";

export const serviceProvidersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(true),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input?.activeOnly !== false) {
        conditions.push(eq(serviceProviders.active, true));
      }

      const result = await db
        .select()
        .from(serviceProviders)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(serviceProviders.name);

      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, input.id))
        .limit(1);

      return result ?? null;
    }),

  create: gestorProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        cnpj: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        specialties: z.string().optional(), // JSON string
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(serviceProviders).values({
        name: input.name,
        cnpj: input.cnpj,
        phone: input.phone,
        email: input.email || undefined,
        address: input.address,
        city: input.city,
        state: input.state,
        specialties: input.specialties,
        observations: input.observations,
        active: true,
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "service_provider",
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
        name: z.string().optional(),
        cnpj: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        specialties: z.string().optional(),
        rating: z.number().min(0).max(5).optional(),
        observations: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      const [previous] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, id))
        .limit(1);

      const setData: Record<string, unknown> = { ...updateData };
      if (typeof setData.rating === 'number') {
        setData.rating = String(setData.rating);
      }

      await db
        .update(serviceProviders)
        .set(setData)
        .where(eq(serviceProviders.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "service_provider",
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

      // Soft delete - just deactivate
      await db
        .update(serviceProviders)
        .set({ active: false })
        .where(eq(serviceProviders.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "service_provider",
        entityId: input.id,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
