import { z } from "zod";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { router, protectedProcedure, gestorProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  checklists,
  checklistResponses,
  checklistTemplates,
  checklistTemplateItems,
  vehicles,
  users,
  occurrences,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { CHECKLIST_RESPONSES } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

import { checklistInput, submitChecklist } from "../domain/checklists";

export const checklistsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          vehicleId: z.number().optional(),
          userId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          hasIssues: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Non-admin users can only see their own checklists
      if (ctx.user.role === "motorista") {
        conditions.push(eq(checklists.userId, ctx.user.id));
      } else if (input?.userId) {
        conditions.push(eq(checklists.userId, input.userId));
      }

      if (input?.vehicleId) {
        conditions.push(eq(checklists.vehicleId, input.vehicleId));
      }
      if (input?.startDate) {
        conditions.push(gte(checklists.executedAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(checklists.executedAt, input.endDate));
      }
      if (input?.hasIssues !== undefined) {
        conditions.push(eq(checklists.hasIssues, input.hasIssues));
      }
      // Filtrar checklists excluídos
      conditions.push(eq(checklists.isDeleted, false));

      const result = await db
        .select({
          id: checklists.id,
          vehicleId: checklists.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          userId: checklists.userId,
          userName: users.name,
          templateId: checklists.templateId,
          templateName: checklistTemplates.name,
          executedAt: checklists.executedAt,
          km: checklists.km,
          hasIssues: checklists.hasIssues,
          observations: checklists.observations,
          createdAt: checklists.createdAt,
        })
        .from(checklists)
        .innerJoin(vehicles, eq(checklists.vehicleId, vehicles.id))
        .innerJoin(users, eq(checklists.userId, users.id))
        .innerJoin(
          checklistTemplates,
          eq(checklists.templateId, checklistTemplates.id)
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(checklists.executedAt), desc(checklists.id));

      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [checklist] = await db
        .select({
          id: checklists.id,
          vehicleId: checklists.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          userId: checklists.userId,
          userName: users.name,
          templateId: checklists.templateId,
          templateName: checklistTemplates.name,
          executedAt: checklists.executedAt,
          km: checklists.km,
          hasIssues: checklists.hasIssues,
          observations: checklists.observations,
          createdAt: checklists.createdAt,
        })
        .from(checklists)
        .innerJoin(vehicles, eq(checklists.vehicleId, vehicles.id))
        .innerJoin(users, eq(checklists.userId, users.id))
        .innerJoin(
          checklistTemplates,
          eq(checklists.templateId, checklistTemplates.id)
        )
        .where(
          and(eq(checklists.id, input.id), eq(checklists.isDeleted, false))
        )
        .limit(1);

      if (!checklist) return null;

      // Get responses with template item details
      const responses = await db
        .select({
          id: checklistResponses.id,
          templateItemId: checklistResponses.templateItemId,
          itemDescription: checklistTemplateItems.description,
          itemCategory: checklistTemplateItems.category,
          isCritical: checklistTemplateItems.isCritical,
          response: checklistResponses.response,
          comment: checklistResponses.comment,
          photoUrl: checklistResponses.photoUrl,
          occurrenceId: checklistResponses.occurrenceId,
        })
        .from(checklistResponses)
        .innerJoin(
          checklistTemplateItems,
          eq(checklistResponses.templateItemId, checklistTemplateItems.id)
        )
        .where(eq(checklistResponses.checklistId, input.id))
        .orderBy(checklistTemplateItems.order);

      return { ...checklist, responses };
    }),

  // Check if user has completed checklist today for a vehicle
  checkTodayStatus: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayChecklist] = await db
        .select({ id: checklists.id, hasIssues: checklists.hasIssues })
        .from(checklists)
        .where(
          and(
            eq(checklists.vehicleId, input.vehicleId),
            eq(checklists.isDeleted, false),
            eq(checklists.userId, ctx.user.id),
            gte(checklists.executedAt, today),
            lte(checklists.executedAt, tomorrow)
          )
        )
        .limit(1);

      return {
        completed: !!todayChecklist,
        checklistId: todayChecklist?.id,
        hasIssues: todayChecklist?.hasIssues,
      };
    }),

  // Submit a new checklist
  submit: protectedProcedure
    .input(checklistInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return submitChecklist(db, ctx.user, input);
    }),

  // Get pending checklists (vehicles without checklist today)
  getPending: protectedProcedure
    .input(
      z
        .object({
          unitId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all active vehicles
      const vehicleConditions = [
        eq(vehicles.active, true),
        eq(vehicles.status, "ativo"),
      ];

      if (input?.unitId) {
        vehicleConditions.push(eq(vehicles.unitId, input.unitId));
      }

      const allVehicles = await db
        .select({
          id: vehicles.id,
          plate: vehicles.plate,
          model: vehicles.model,
          vehicleType: vehicles.vehicleType,
        })
        .from(vehicles)
        .where(and(...vehicleConditions));

      // Get vehicles with checklist today by current user
      const completedToday = await db
        .select({ vehicleId: checklists.vehicleId })
        .from(checklists)
        .where(
          and(
            eq(checklists.userId, ctx.user.id),
            gte(checklists.executedAt, today),
            lte(checklists.executedAt, tomorrow)
          )
        );

      const completedVehicleIds = completedToday.map(c => c.vehicleId);

      // Filter out completed vehicles
      const pending = allVehicles.filter(
        v => !completedVehicleIds.includes(v.id)
      );

      return pending;
    }),

  // Get checklist statistics for dashboard
  stats: gestorProcedure
    .input(
      z
        .object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          unitId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input?.startDate) {
        conditions.push(gte(checklists.executedAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(checklists.executedAt, input.endDate));
      }
      if (input?.unitId) {
        conditions.push(eq(vehicles.unitId, input.unitId));
      }

      const allChecklists = await db
        .select({
          id: checklists.id,
          hasIssues: checklists.hasIssues,
        })
        .from(checklists)
        .innerJoin(vehicles, eq(checklists.vehicleId, vehicles.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = allChecklists.length;
      const withIssues = allChecklists.filter(c => c.hasIssues).length;
      const conformidade =
        total > 0 ? Math.round(((total - withIssues) / total) * 100) : 100;

      return {
        total,
        withIssues,
        withoutIssues: total - withIssues,
        conformidade,
      };
    }),

  // Excluir checklist (exclusão lógica)
  delete: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [previous] = await db
        .select()
        .from(checklists)
        .where(
          and(eq(checklists.id, input.id), eq(checklists.isDeleted, false))
        )
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Checklist não encontrado",
        });
      }

      await db
        .update(checklists)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedById: ctx.user.id,
        })
        .where(eq(checklists.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "checklist",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        newData: { isDeleted: true, deletedById: ctx.user.id },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),
});
