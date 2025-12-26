import { z } from "zod";
import { eq, desc, and, gte, lte, like } from "drizzle-orm";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs, users } from "../../drizzle/schema";

export const auditLogsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input?.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }
      if (input?.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }
      if (input?.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }
      if (input?.entityId) {
        conditions.push(eq(auditLogs.entityId, input.entityId));
      }
      if (input?.startDate) {
        conditions.push(gte(auditLogs.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(auditLogs.createdAt, input.endDate));
      }

      const result = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: auditLogs.userName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          previousData: auditLogs.previousData,
          newData: auditLogs.newData,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0);

      return result;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, input.id))
        .limit(1);

      return log ?? null;
    }),

  // Get entity history
  getEntityHistory: adminProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, input.entityType),
            eq(auditLogs.entityId, input.entityId)
          )
        )
        .orderBy(desc(auditLogs.createdAt));

      return result;
    }),

  // Get user activity
  getUserActivity: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, input.userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);

      return result;
    }),

  // Get available actions for filtering
  getActions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action);

    return result.map((r) => r.action);
  }),

  // Get available entity types for filtering
  getEntityTypes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs)
      .orderBy(auditLogs.entityType);

    return result.map((r) => r.entityType);
  }),

  // Get statistics
  stats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input?.startDate) {
        conditions.push(gte(auditLogs.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(auditLogs.createdAt, input.endDate));
      }

      const allLogs = await db
        .select({
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          userId: auditLogs.userId,
        })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Count by action
      const byAction: Record<string, number> = {};
      allLogs.forEach((log) => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      });

      // Count by entity type
      const byEntityType: Record<string, number> = {};
      allLogs.forEach((log) => {
        byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
      });

      // Count unique users
      const uniqueUsers = new Set(allLogs.filter((l) => l.userId).map((l) => l.userId)).size;

      return {
        total: allLogs.length,
        byAction,
        byEntityType,
        uniqueUsers,
      };
    }),
});
