import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { projects, units } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
        description: projects.description,
        client: projects.client,
        unitId: projects.unitId,
        unitName: units.name,
        active: projects.active,
        startDate: projects.startDate,
        endDate: projects.endDate,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(units, eq(projects.unitId, units.id))
      .orderBy(desc(projects.createdAt));

    return result;
  }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.active, true))
      .orderBy(projects.name);

    return result;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: projects.id,
          name: projects.name,
          code: projects.code,
          description: projects.description,
          client: projects.client,
          unitId: projects.unitId,
          unitName: units.name,
          active: projects.active,
          startDate: projects.startDate,
          endDate: projects.endDate,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .leftJoin(units, eq(projects.unitId, units.id))
        .where(eq(projects.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        code: z.string().min(1, "Código é obrigatório"),
        description: z.string().optional(),
        client: z.string().optional(),
        unitId: z.number().optional(),
        active: z.boolean().default(true),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(projects).values(input);
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "project",
        entityId: insertId,
        newData: input as Record<string, unknown>,
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
        description: z.string().optional(),
        client: z.string().optional(),
        unitId: z.number().nullable().optional(),
        active: z.boolean().optional(),
        startDate: z.date().nullable().optional(),
        endDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      await db.update(projects).set(updateData).where(eq(projects.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "project",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
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
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      // Soft delete by setting active to false
      await db
        .update(projects)
        .set({ active: false })
        .where(eq(projects.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "project",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
