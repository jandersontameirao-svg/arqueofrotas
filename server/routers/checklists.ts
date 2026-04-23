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

export const checklistsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().optional(),
        userId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        hasIssues: z.boolean().optional(),
      }).optional()
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
        .innerJoin(checklistTemplates, eq(checklists.templateId, checklistTemplates.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(checklists.executedAt));

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
        .innerJoin(checklistTemplates, eq(checklists.templateId, checklistTemplates.id))
        .where(and(eq(checklists.id, input.id), eq(checklists.isDeleted, false)))
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
    .input(
      z.object({
        vehicleId: z.number(),
        templateId: z.number(),
        km: z.number().min(0).optional(),
        observations: z.string().optional(),
        responses: z.array(
          z.object({
            templateItemId: z.number(),
            response: z.enum(CHECKLIST_RESPONSES),
            comment: z.string().optional(),
            photoData: z.string().optional(), // Base64
            photoFileName: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if vehicle exists and is active
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId))
        .limit(1);

      if (!vehicle || !vehicle.active) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      }

      // Get template items to check for critical items
      const templateItems = await db
        .select()
        .from(checklistTemplateItems)
        .where(
          and(
            eq(checklistTemplateItems.templateId, input.templateId),
            eq(checklistTemplateItems.active, true)
          )
        );

      const criticalItemIds = templateItems
        .filter((item) => item.isCritical)
        .map((item) => item.id);

      // Check if any critical item has "nao_ok" response
      const hasIssues = input.responses.some(
        (r) => r.response === "nao_ok" && criticalItemIds.includes(r.templateItemId)
      );

      // Create checklist
      const checklistResult = await db.insert(checklists).values({
        vehicleId: input.vehicleId,
        userId: ctx.user.id,
        templateId: input.templateId,
        km: input.km,
        observations: input.observations,
        hasIssues,
        executedAt: new Date(),
      });
      const checklistId = checklistResult[0].insertId;

      // Process responses
      for (const response of input.responses) {
        let photoUrl: string | undefined;
        let occurrenceId: number | undefined;

        // Upload photo if provided
        if (response.photoData && response.photoFileName) {
          const buffer = Buffer.from(response.photoData, "base64");
          const key = `checklists/${checklistId}/${Date.now()}-${response.photoFileName}`;
          const uploadResult = await storagePut(key, buffer, "image/jpeg");
          photoUrl = uploadResult.url;
        }

        // Create occurrence for critical items with "nao_ok"
        if (
          response.response === "nao_ok" &&
          criticalItemIds.includes(response.templateItemId)
        ) {
          const templateItem = templateItems.find(
            (item) => item.id === response.templateItemId
          );

          const occurrenceResult = await db.insert(occurrences).values({
            vehicleId: input.vehicleId,
            reportedById: ctx.user.id,
            occurredAt: new Date(),
            description: `Checklist: ${templateItem?.description ?? "Item crítico"} - ${response.comment ?? "Não conforme"}`,
            severity: "alta",
            status: "aberto",
          });
          occurrenceId = occurrenceResult[0].insertId;

          // If severity is high, set vehicle to maintenance
          await db
            .update(vehicles)
            .set({ status: "manutencao" })
            .where(eq(vehicles.id, input.vehicleId));

          await createAuditLog({
            user: ctx.user,
            action: "OCCURRENCE_OPEN",
            entityType: "occurrence",
            entityId: occurrenceId,
            newData: {
              vehicleId: input.vehicleId,
              fromChecklist: true,
              checklistId,
              templateItemId: response.templateItemId,
            },
            ...getRequestInfo(ctx.req),
          });

          await createAuditLog({
            user: ctx.user,
            action: "STATUS_CHANGE",
            entityType: "vehicle",
            entityId: input.vehicleId,
            previousData: { status: vehicle.status },
            newData: { status: "manutencao", reason: "Ocorrência crítica de checklist" },
            ...getRequestInfo(ctx.req),
          });
        }

        // Insert response
        await db.insert(checklistResponses).values({
          checklistId,
          templateItemId: response.templateItemId,
          response: response.response,
          comment: response.comment,
          photoUrl,
          occurrenceId,
        });
      }

      await createAuditLog({
        user: ctx.user,
        action: "CHECKLIST_SUBMIT",
        entityType: "checklist",
        entityId: checklistId,
        newData: {
          vehicleId: input.vehicleId,
          templateId: input.templateId,
          hasIssues,
          responsesCount: input.responses.length,
        },
        ...getRequestInfo(ctx.req),
      });

      return { id: checklistId, hasIssues };
    }),

  // Get pending checklists (vehicles without checklist today)
  getPending: protectedProcedure
    .input(
      z.object({
        unitId: z.number().optional(),
      }).optional()
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

      const completedVehicleIds = completedToday.map((c) => c.vehicleId);

      // Filter out completed vehicles
      const pending = allVehicles.filter(
        (v) => !completedVehicleIds.includes(v.id)
      );

      return pending;
    }),

  // Get checklist statistics for dashboard
  stats: gestorProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        unitId: z.number().optional(),
      }).optional()
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
      const withIssues = allChecklists.filter((c) => c.hasIssues).length;
      const conformidade = total > 0 ? Math.round(((total - withIssues) / total) * 100) : 100;

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
        .where(and(eq(checklists.id, input.id), eq(checklists.isDeleted, false)))
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
