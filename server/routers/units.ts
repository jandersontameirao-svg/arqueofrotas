import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { units } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";

export const unitsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(units)
      .orderBy(desc(units.createdAt));

    return result;
  }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(units)
      .where(eq(units.active, true))
      .orderBy(units.name);

    return result;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(units)
        .where(eq(units.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        code: z.string().min(1, "Código é obrigatório"),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(units).values(input);
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "unit",
        entityId: insertId,
        newData: input,
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(units)
        .where(eq(units.id, id))
        .limit(1);

      await db.update(units).set(updateData).where(eq(units.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "unit",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(units)
        .where(eq(units.id, input.id))
        .limit(1);

      // Soft delete by setting active to false
      await db
        .update(units)
        .set({ active: false })
        .where(eq(units.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "unit",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
