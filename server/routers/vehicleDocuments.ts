import { z } from "zod";
import { eq, desc, and, lte, gte, sql } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { vehicleDocuments, vehicles } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { DOCUMENT_TYPES } from "@shared/const";
import { storagePut } from "../storage";

export const vehicleDocumentsRouter = router({
  listByVehicle: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.vehicleId, input.vehicleId))
        .orderBy(desc(vehicleDocuments.expirationDate));

      return result;
    }),

  // List documents expiring soon (for alerts)
  listExpiring: protectedProcedure
    .input(
      z.object({
        daysAhead: z.number().default(30),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const daysAhead = input?.daysAhead ?? 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const result = await db
        .select({
          id: vehicleDocuments.id,
          vehicleId: vehicleDocuments.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          documentType: vehicleDocuments.documentType,
          description: vehicleDocuments.description,
          expirationDate: vehicleDocuments.expirationDate,
          fileName: vehicleDocuments.fileName,
        })
        .from(vehicleDocuments)
        .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
        .where(
          and(
            eq(vehicles.active, true),
            lte(vehicleDocuments.expirationDate, futureDate)
          )
        )
        .orderBy(vehicleDocuments.expirationDate);

      return result;
    }),

  // List expired documents
  listExpired: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();

    const result = await db
      .select({
        id: vehicleDocuments.id,
        vehicleId: vehicleDocuments.vehicleId,
        vehiclePlate: vehicles.plate,
        vehicleModel: vehicles.model,
        documentType: vehicleDocuments.documentType,
        description: vehicleDocuments.description,
        expirationDate: vehicleDocuments.expirationDate,
        fileName: vehicleDocuments.fileName,
      })
      .from(vehicleDocuments)
      .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicles.active, true),
          lte(vehicleDocuments.expirationDate, today)
        )
      )
      .orderBy(vehicleDocuments.expirationDate);

    return result;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),

  create: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        documentType: z.enum(DOCUMENT_TYPES),
        description: z.string().optional(),
        expirationDate: z.date().optional(),
        fileData: z.string().optional(), // Base64 encoded file
        fileName: z.string().optional(),
        fileType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let fileUrl: string | undefined;
      let fileSize: number | undefined;

      // Upload file if provided
      if (input.fileData && input.fileName) {
        const buffer = Buffer.from(input.fileData, "base64");
        fileSize = buffer.length;
        const key = `vehicles/${input.vehicleId}/documents/${Date.now()}-${input.fileName}`;
        const uploadResult = await storagePut(key, buffer, input.fileType);
        fileUrl = uploadResult.url;
      }

      const result = await db.insert(vehicleDocuments).values({
        vehicleId: input.vehicleId,
        documentType: input.documentType,
        description: input.description,
        expirationDate: input.expirationDate,
        fileUrl,
        fileName: input.fileName,
        fileSize,
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: ctx.user,
        action: "DOCUMENT_UPLOAD",
        entityType: "vehicle_document",
        entityId: insertId,
        newData: {
          vehicleId: input.vehicleId,
          documentType: input.documentType,
          fileName: input.fileName,
        },
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId };
    }),

  update: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        documentType: z.enum(DOCUMENT_TYPES).optional(),
        description: z.string().optional(),
        expirationDate: z.date().nullable().optional(),
        fileData: z.string().optional(), // Base64 encoded file
        fileName: z.string().optional(),
        fileType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, fileData, fileType, ...updateData } = input;

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.id, id))
        .limit(1);

      // Upload new file if provided
      if (fileData && input.fileName) {
        const buffer = Buffer.from(fileData, "base64");
        const key = `vehicles/${previous.vehicleId}/documents/${Date.now()}-${input.fileName}`;
        const uploadResult = await storagePut(key, buffer, fileType);
        (updateData as Record<string, unknown>).fileUrl = uploadResult.url;
        (updateData as Record<string, unknown>).fileSize = buffer.length;
      }

      await db
        .update(vehicleDocuments)
        .set(updateData)
        .where(eq(vehicleDocuments.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "vehicle_document",
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

      // Get previous data for audit
      const [previous] = await db
        .select()
        .from(vehicleDocuments)
        .where(eq(vehicleDocuments.id, input.id))
        .limit(1);

      await db
        .delete(vehicleDocuments)
        .where(eq(vehicleDocuments.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "vehicle_document",
        entityId: input.id,
        previousData: previous as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get document statistics for dashboard
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const allDocs = await db
      .select({
        expirationDate: vehicleDocuments.expirationDate,
      })
      .from(vehicleDocuments)
      .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
      .where(eq(vehicles.active, true));

    const expired = allDocs.filter(
      (d) => d.expirationDate && d.expirationDate <= today
    ).length;
    const expiring7 = allDocs.filter(
      (d) =>
        d.expirationDate &&
        d.expirationDate > today &&
        d.expirationDate <= in7Days
    ).length;
    const expiring15 = allDocs.filter(
      (d) =>
        d.expirationDate &&
        d.expirationDate > in7Days &&
        d.expirationDate <= in15Days
    ).length;
    const expiring30 = allDocs.filter(
      (d) =>
        d.expirationDate &&
        d.expirationDate > in15Days &&
        d.expirationDate <= in30Days
    ).length;

    return {
      total: allDocs.length,
      expired,
      expiring7,
      expiring15,
      expiring30,
    };
  }),
});
