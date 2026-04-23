import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { appNotifications } from "../../drizzle/schema";

export const notificationsRouter = router({
  // List notifications for the current user
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(appNotifications.userId, ctx.user.id)];
      if (input?.unreadOnly) {
        conditions.push(eq(appNotifications.read, false));
      }

      const result = await db
        .select()
        .from(appNotifications)
        .where(and(...conditions))
        .orderBy(desc(appNotifications.createdAt))
        .limit(input?.limit ?? 50);

      return result;
    }),

  // Count unread notifications
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.userId, ctx.user.id),
          eq(appNotifications.read, false)
        )
      );

    return { count: result?.count ?? 0 };
  }),

  // Mark a notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(appNotifications)
        .set({ read: true, readAt: new Date() })
        .where(
          and(
            eq(appNotifications.id, input.id),
            eq(appNotifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(appNotifications)
      .set({ read: true, readAt: new Date() })
      .where(
        and(
          eq(appNotifications.userId, ctx.user.id),
          eq(appNotifications.read, false)
        )
      );

    return { success: true };
  }),

  // Delete a notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(appNotifications)
        .where(
          and(
            eq(appNotifications.id, input.id),
            eq(appNotifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});
