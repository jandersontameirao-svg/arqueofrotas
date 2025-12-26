import { z } from "zod";
import { eq, desc, and, asc } from "drizzle-orm";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { checklistTemplates, checklistTemplateItems } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { VEHICLE_TYPES } from "@shared/const";

export const checklistTemplatesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(checklistTemplates)
      .orderBy(desc(checklistTemplates.createdAt));

    return result;
  }),

  listActive: protectedProcedure
    .input(
      z.object({
        vehicleType: z.enum(VEHICLE_TYPES).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(checklistTemplates.active, true)];

      // If vehicleType is provided, filter by it or null (applies to all)
      // For now, we'll get all active templates and filter in application

      const result = await db
        .select()
        .from(checklistTemplates)
        .where(and(...conditions))
        .orderBy(checklistTemplates.name);

      // Filter by vehicleType if provided
      if (input?.vehicleType) {
        return result.filter(
          (t) => t.vehicleType === null || t.vehicleType === input.vehicleType
        );
      }

      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db
        .select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, input.id))
        .limit(1);

      if (!template) return null;

      const items = await db
        .select()
        .from(checklistTemplateItems)
        .where(eq(checklistTemplateItems.templateId, input.id))
        .orderBy(asc(checklistTemplateItems.order));

      return { ...template, items };
    }),

  getWithItems: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db
        .select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, input.id))
        .limit(1);

      if (!template) return null;

      const items = await db
        .select()
        .from(checklistTemplateItems)
        .where(
          and(
            eq(checklistTemplateItems.templateId, input.id),
            eq(checklistTemplateItems.active, true)
          )
        )
        .orderBy(asc(checklistTemplateItems.order));

      return { ...template, items };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        description: z.string().optional(),
        vehicleType: z.enum(VEHICLE_TYPES).nullable().optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(checklistTemplates).values(input);
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "checklist_template",
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
        description: z.string().optional(),
        vehicleType: z.enum(VEHICLE_TYPES).nullable().optional(),
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
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, id))
        .limit(1);

      await db
        .update(checklistTemplates)
        .set(updateData)
        .where(eq(checklistTemplates.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "checklist_template",
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
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, input.id))
        .limit(1);

      // Soft delete
      await db
        .update(checklistTemplates)
        .set({ active: false })
        .where(eq(checklistTemplates.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "checklist_template",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Template Items
  addItem: adminProcedure
    .input(
      z.object({
        templateId: z.number(),
        description: z.string().min(1, "Descrição é obrigatória"),
        category: z.string().optional(),
        isCritical: z.boolean().default(false),
        order: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(checklistTemplateItems).values(input);
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "checklist_template_item",
        entityId: insertId,
        newData: input as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId };
    }),

  updateItem: adminProcedure
    .input(
      z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        category: z.string().optional(),
        isCritical: z.boolean().optional(),
        order: z.number().optional(),
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
        .from(checklistTemplateItems)
        .where(eq(checklistTemplateItems.id, id))
        .limit(1);

      await db
        .update(checklistTemplateItems)
        .set(updateData)
        .where(eq(checklistTemplateItems.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "checklist_template_item",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  deleteItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(checklistTemplateItems)
        .where(eq(checklistTemplateItems.id, input.id))
        .limit(1);

      // Soft delete
      await db
        .update(checklistTemplateItems)
        .set({ active: false })
        .where(eq(checklistTemplateItems.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "checklist_template_item",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Reorder items
  reorderItems: adminProcedure
    .input(
      z.object({
        templateId: z.number(),
        itemIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Update order for each item
      for (let i = 0; i < input.itemIds.length; i++) {
        await db
          .update(checklistTemplateItems)
          .set({ order: i })
          .where(eq(checklistTemplateItems.id, input.itemIds[i]));
      }

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "checklist_template",
        entityId: input.templateId,
        newData: { reorderedItems: input.itemIds },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
