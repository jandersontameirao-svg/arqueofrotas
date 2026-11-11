import { z } from "zod";
import { eq, desc, and, ne } from "drizzle-orm";
import {
  router,
  adminProcedure,
  protectedProcedure,
  gestorProcedure,
} from "../_core/trpc";
import { getDb } from "../db";
import { users, units } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { USER_ROLES } from "@shared/const";
import { hashPassword, verifyPassword } from "../_core/password";

export const usersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        role: users.role,
        unitId: users.unitId,
        unitName: units.name,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .leftJoin(units, eq(users.unitId, units.id))
      .where(eq(users.active, true))
      .orderBy(desc(users.createdAt));

    return result;
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido"),
        role: z.enum(USER_ROLES).default("motorista"),
        unitId: z.number().nullable().optional(),
        phone: z.string().optional(),
        openId: z.string().optional(),
        password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate a unique openId if not provided
      const openId =
        input.openId ||
        `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Check if email already exists
      if (input.email) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        if (existing.length > 0) {
          throw new Error("Já existe um usuário com este email");
        }
      }

      const passwordHash = input.password
        ? await hashPassword(input.password)
        : null;

      const result = await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: passwordHash ? "local" : null,
        role: input.role,
        unitId: input.unitId ?? null,
        phone: input.phone,
        active: true,
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "user",
        entityId: insertId,
        newData: {
          name: input.name,
          email: input.email,
          role: input.role,
        } as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId };
    }),

  listActive: gestorProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.active, true))
      .orderBy(users.name);

    return result;
  }),

  listByRole: gestorProcedure
    .input(z.object({ role: z.enum(USER_ROLES) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(and(eq(users.active, true), eq(users.role, input.role)))
        .orderBy(users.name);

      return result;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          role: users.role,
          unitId: users.unitId,
          unitName: units.name,
          phone: users.phone,
          active: users.active,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .leftJoin(units, eq(users.unitId, units.id))
        .where(eq(users.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(USER_ROLES).optional(),
        unitId: z.number().nullable().optional(),
        phone: z.string().optional(),
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
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      await db.update(users).set(updateData).where(eq(users.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "user",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Prevent self-deactivation
      if (input.id === ctx.user.id) {
        throw new Error("Você não pode desativar sua própria conta");
      }

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      await db
        .update(users)
        .set({ active: false })
        .where(eq(users.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "user",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Admin: set/reset another user's password
  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.number(),
        password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const passwordHash = await hashPassword(input.password);
      await db
        .update(users)
        .set({ passwordHash, loginMethod: "local" })
        .where(eq(users.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "user",
        entityId: input.id,
        newData: { passwordReset: true } as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Self: change own password (requires current password)
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [current] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      // If the account already has a password, the current one must match.
      if (current?.passwordHash) {
        const ok = await verifyPassword(input.currentPassword, current.passwordHash);
        if (!ok) throw new Error("Senha atual incorreta");
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({ passwordHash, loginMethod: "local" })
        .where(eq(users.id, ctx.user.id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "user",
        entityId: ctx.user.id,
        newData: { passwordChanged: true } as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get current user profile
  profile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        unitId: users.unitId,
        unitName: units.name,
        phone: users.phone,
      })
      .from(users)
      .leftJoin(units, eq(users.unitId, units.id))
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return result[0] ?? null;
  }),

  // Update current user profile (limited fields)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      await db.update(users).set(input).where(eq(users.id, ctx.user.id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "user",
        entityId: ctx.user.id,
        previousData: previous as Record<string, unknown>,
        newData: input as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
