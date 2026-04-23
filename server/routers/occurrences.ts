import { z } from "zod";
import { eq, desc, and, ne } from "drizzle-orm";
import { router, protectedProcedure, gestorProcedure, permissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  occurrences,
  occurrenceAttachments,
  occurrenceComments,
  vehicles,
  users,
  serviceOrders,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { SEVERITY_LEVELS, OCCURRENCE_STATUSES } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export const occurrencesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().optional(),
        status: z.enum(OCCURRENCE_STATUSES).optional(),
        severity: z.enum(SEVERITY_LEVELS).optional(),
        reportedById: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      // Non-admin users can only see their own occurrences
      if (ctx.user.role === "motorista") {
        conditions.push(eq(occurrences.reportedById, ctx.user.id));
      } else if (input?.reportedById) {
        conditions.push(eq(occurrences.reportedById, input.reportedById));
      }

      if (input?.vehicleId) {
        conditions.push(eq(occurrences.vehicleId, input.vehicleId));
      }
      if (input?.status) {
        conditions.push(eq(occurrences.status, input.status));
      }
      if (input?.severity) {
        conditions.push(eq(occurrences.severity, input.severity));
      }

      const result = await db
        .select({
          id: occurrences.id,
          vehicleId: occurrences.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          reportedById: occurrences.reportedById,
          reportedByName: users.name,
          occurredAt: occurrences.occurredAt,
          location: occurrences.location,
          description: occurrences.description,
          severity: occurrences.severity,
          status: occurrences.status,
          serviceOrderId: occurrences.serviceOrderId,
          createdAt: occurrences.createdAt,
        })
        .from(occurrences)
        .innerJoin(vehicles, eq(occurrences.vehicleId, vehicles.id))
        .innerJoin(users, eq(occurrences.reportedById, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(occurrences.createdAt));

      return result;
    }),

  // List open occurrences for dashboard
  listOpen: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: occurrences.id,
        vehicleId: occurrences.vehicleId,
        vehiclePlate: vehicles.plate,
        vehicleModel: vehicles.model,
        reportedByName: users.name,
        occurredAt: occurrences.occurredAt,
        description: occurrences.description,
        severity: occurrences.severity,
        status: occurrences.status,
        createdAt: occurrences.createdAt,
      })
      .from(occurrences)
      .innerJoin(vehicles, eq(occurrences.vehicleId, vehicles.id))
      .innerJoin(users, eq(occurrences.reportedById, users.id))
      .where(ne(occurrences.status, "encerrado"))
      .orderBy(desc(occurrences.severity), desc(occurrences.createdAt));

    return result;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [occurrence] = await db
        .select({
          id: occurrences.id,
          vehicleId: occurrences.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          reportedById: occurrences.reportedById,
          reportedByName: users.name,
          checklistResponseId: occurrences.checklistResponseId,
          serviceOrderId: occurrences.serviceOrderId,
          occurredAt: occurrences.occurredAt,
          location: occurrences.location,
          description: occurrences.description,
          severity: occurrences.severity,
          status: occurrences.status,
          closedAt: occurrences.closedAt,
          closedById: occurrences.closedById,
          closureNotes: occurrences.closureNotes,
          createdAt: occurrences.createdAt,
          updatedAt: occurrences.updatedAt,
        })
        .from(occurrences)
        .innerJoin(vehicles, eq(occurrences.vehicleId, vehicles.id))
        .innerJoin(users, eq(occurrences.reportedById, users.id))
        .where(eq(occurrences.id, input.id))
        .limit(1);

      if (!occurrence) return null;

      // Get attachments
      const attachments = await db
        .select({
          id: occurrenceAttachments.id,
          fileUrl: occurrenceAttachments.fileUrl,
          fileName: occurrenceAttachments.fileName,
          fileType: occurrenceAttachments.fileType,
          description: occurrenceAttachments.description,
          uploadedById: occurrenceAttachments.uploadedById,
          uploadedByName: users.name,
          createdAt: occurrenceAttachments.createdAt,
        })
        .from(occurrenceAttachments)
        .leftJoin(users, eq(occurrenceAttachments.uploadedById, users.id))
        .where(eq(occurrenceAttachments.occurrenceId, input.id))
        .orderBy(desc(occurrenceAttachments.createdAt));

      // Get comments
      const comments = await db
        .select({
          id: occurrenceComments.id,
          userId: occurrenceComments.userId,
          userName: users.name,
          comment: occurrenceComments.comment,
          createdAt: occurrenceComments.createdAt,
        })
        .from(occurrenceComments)
        .innerJoin(users, eq(occurrenceComments.userId, users.id))
        .where(eq(occurrenceComments.occurrenceId, input.id))
        .orderBy(occurrenceComments.createdAt);

      return { ...occurrence, attachments, comments };
    }),

  create: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        occurredAt: z.date(),
        location: z.string().optional(),
        description: z.string().min(1, "Descrição é obrigatória"),
        severity: z.enum(SEVERITY_LEVELS),
        photoData: z.string().optional(), // Base64
        photoFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if vehicle exists
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId))
        .limit(1);

      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      }

      const { photoData, photoFileName, ...occurrenceData } = input;

      const result = await db.insert(occurrences).values({
        ...occurrenceData,
        reportedById: ctx.user.id,
        status: "aberto",
      });
      const insertId = result[0].insertId;

      // Upload photo if provided
      if (photoData && photoFileName) {
        const buffer = Buffer.from(photoData, "base64");
        const key = `occurrences/${insertId}/${Date.now()}-${photoFileName}`;
        const uploadResult = await storagePut(key, buffer, "image/jpeg");

        await db.insert(occurrenceAttachments).values({
          occurrenceId: insertId,
          fileUrl: uploadResult.url,
          fileName: photoFileName,
          fileType: "image/jpeg",
          fileSize: buffer.length,
          uploadedById: ctx.user.id,
        });
      }

      // If severity is high, set vehicle to maintenance
      if (input.severity === "alta") {
        await db
          .update(vehicles)
          .set({ status: "manutencao" })
          .where(eq(vehicles.id, input.vehicleId));

        await createAuditLog({
          user: ctx.user,
          action: "STATUS_CHANGE",
          entityType: "vehicle",
          entityId: input.vehicleId,
          previousData: { status: vehicle.status },
          newData: { status: "manutencao", reason: "Ocorrência de alta severidade" },
          ...getRequestInfo(ctx.req),
        });
      }

      await createAuditLog({
        user: ctx.user,
        action: "OCCURRENCE_OPEN",
        entityType: "occurrence",
        entityId: insertId,
        newData: occurrenceData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId };
    }),

  update: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        vehicleId: z.number().optional(),
        occurredAt: z.date().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        severity: z.enum(SEVERITY_LEVELS).optional(),
        status: z.enum(OCCURRENCE_STATUSES).optional(),
        reportedById: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Get previous data
      const [previous] = await db
        .select()
        .from(occurrences)
        .where(eq(occurrences.id, id))
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ocorrência não encontrada",
        });
      }

      await db.update(occurrences).set(updateData).where(eq(occurrences.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "occurrence",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Close occurrence (requires permission)
  close: permissionProcedure("canCloseOccurrence")
    .input(
      z.object({
        id: z.number(),
        closureNotes: z.string().min(1, "Notas de encerramento são obrigatórias"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get previous data
      const [previous] = await db
        .select()
        .from(occurrences)
        .where(eq(occurrences.id, input.id))
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ocorrência não encontrada",
        });
      }

      if (previous.status === "encerrado") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ocorrência já está encerrada",
        });
      }

      await db
        .update(occurrences)
        .set({
          status: "encerrado",
          closedAt: new Date(),
          closedById: ctx.user.id,
          closureNotes: input.closureNotes,
        })
        .where(eq(occurrences.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "OCCURRENCE_CLOSE",
        entityType: "occurrence",
        entityId: input.id,
        previousData: { status: previous.status },
        newData: { status: "encerrado", closureNotes: input.closureNotes },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Link to service order
  linkToServiceOrder: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        serviceOrderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify service order exists
      const [so] = await db
        .select({ id: serviceOrders.id })
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.serviceOrderId))
        .limit(1);

      if (!so) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem de serviço não encontrada",
        });
      }

      await db
        .update(occurrences)
        .set({
          serviceOrderId: input.serviceOrderId,
          status: "em_tratamento",
        })
        .where(eq(occurrences.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "occurrence",
        entityId: input.id,
        newData: { serviceOrderId: input.serviceOrderId, status: "em_tratamento" },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Add attachment
  addAttachment: protectedProcedure
    .input(
      z.object({
        occurrenceId: z.number(),
        fileData: z.string(), // Base64
        fileName: z.string(),
        fileType: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const buffer = Buffer.from(input.fileData, "base64");
      const key = `occurrences/${input.occurrenceId}/${Date.now()}-${input.fileName}`;
      const uploadResult = await storagePut(key, buffer, input.fileType ?? "application/octet-stream");

      const result = await db.insert(occurrenceAttachments).values({
        occurrenceId: input.occurrenceId,
        fileUrl: uploadResult.url,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: buffer.length,
        description: input.description,
        uploadedById: ctx.user.id,
      });

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "occurrence_attachment",
        entityId: result[0].insertId,
        newData: { occurrenceId: input.occurrenceId, fileName: input.fileName },
        ...getRequestInfo(ctx.req),
      });

      return { id: result[0].insertId, url: uploadResult.url };
    }),

  // Add comment
  addComment: protectedProcedure
    .input(
      z.object({
        occurrenceId: z.number(),
        comment: z.string().min(1, "Comentário é obrigatório"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(occurrenceComments).values({
        occurrenceId: input.occurrenceId,
        userId: ctx.user.id,
        comment: input.comment,
      });

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "occurrence_comment",
        entityId: result[0].insertId,
        newData: { occurrenceId: input.occurrenceId },
        ...getRequestInfo(ctx.req),
      });

      return { id: result[0].insertId };
    }),

  // Delete occurrence (logical delete - sets status to 'encerrado' and marks deleted)
  delete: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [previous] = await db
        .select()
        .from(occurrences)
        .where(eq(occurrences.id, input.id))
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ocorrência não encontrada",
        });
      }

      // Logical delete: close the occurrence with deletion note
      await db
        .update(occurrences)
        .set({
          status: "encerrado",
          closedAt: new Date(),
          closedById: ctx.user.id,
          closureNotes: `[EXCLUÍDA] Excluída por ${ctx.user.name ?? ctx.user.openId} em ${new Date().toLocaleString("pt-BR")}`,
        })
        .where(eq(occurrences.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "occurrence",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        newData: { status: "encerrado", deletedBy: ctx.user.id },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get statistics for dashboard
  stats: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allOccurrences = await db
      .select({
        status: occurrences.status,
        severity: occurrences.severity,
      })
      .from(occurrences);

    const total = allOccurrences.length;
    const abertos = allOccurrences.filter((o) => o.status === "aberto").length;
    const emTratamento = allOccurrences.filter((o) => o.status === "em_tratamento").length;
    const encerrados = allOccurrences.filter((o) => o.status === "encerrado").length;
    const alta = allOccurrences.filter((o) => o.severity === "alta" && o.status !== "encerrado").length;
    const media = allOccurrences.filter((o) => o.severity === "media" && o.status !== "encerrado").length;
    const baixa = allOccurrences.filter((o) => o.severity === "baixa" && o.status !== "encerrado").length;

    return {
      total,
      abertos,
      emTratamento,
      encerrados,
      porSeveridade: { alta, media, baixa },
    };
  }),
});
