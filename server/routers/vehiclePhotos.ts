import { z } from "zod";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { vehiclePhotos } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog, getRequestInfo } from "../audit";
import { TRPCError } from "@trpc/server";

const photoTypeEnum = z.enum([
  "frente",
  "traseira",
  "lateral_esquerda",
  "lateral_direita",
  "interior",
]);

export const vehiclePhotosRouter = router({
  // Listar fotos de um veículo
  listByVehicle: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const photos = await db
        .select()
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.vehicleId, input.vehicleId));
      return photos;
    }),

  // Obter foto por tipo
  getByType: protectedProcedure
    .input(z.object({ vehicleId: z.number(), photoType: photoTypeEnum }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [photo] = await db
        .select()
        .from(vehiclePhotos)
        .where(
          and(
            eq(vehiclePhotos.vehicleId, input.vehicleId),
            eq(vehiclePhotos.photoType, input.photoType)
          )
        );
      return photo || null;
    }),

  // Criar ou atualizar foto
  upsert: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        photoType: photoTypeEnum,
        photoUrl: z.string().url(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const reqInfo = getRequestInfo(ctx.req);
      
      // Verificar se já existe foto desse tipo para o veículo
      const [existing] = await db
        .select()
        .from(vehiclePhotos)
        .where(
          and(
            eq(vehiclePhotos.vehicleId, input.vehicleId),
            eq(vehiclePhotos.photoType, input.photoType)
          )
        );

      if (existing) {
        // Atualizar
        await db
          .update(vehiclePhotos)
          .set({
            photoUrl: input.photoUrl,
            description: input.description,
            uploadedById: ctx.user.id,
          })
          .where(eq(vehiclePhotos.id, existing.id));

        await createAuditLog({
          user: ctx.user,
          action: "UPDATE",
          entityType: "vehicle",
          entityId: existing.id,
          previousData: existing as unknown as Record<string, unknown>,
          newData: input as unknown as Record<string, unknown>,
          ...reqInfo,
        });

        return { id: existing.id, updated: true };
      } else {
        // Criar
        const [result] = await db.insert(vehiclePhotos).values({
          vehicleId: input.vehicleId,
          photoType: input.photoType,
          photoUrl: input.photoUrl,
          description: input.description,
          uploadedById: ctx.user.id,
        });

        await createAuditLog({
          user: ctx.user,
          action: "CREATE",
          entityType: "vehicle",
          entityId: result.insertId,
          newData: input as unknown as Record<string, unknown>,
          ...reqInfo,
        });

        return { id: result.insertId, updated: false };
      }
    }),

  // Deletar foto
  delete: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const reqInfo = getRequestInfo(ctx.req);
      
      const [existing] = await db
        .select()
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Foto não encontrada" });
      }

      await db.delete(vehiclePhotos).where(eq(vehiclePhotos.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "vehicle",
        entityId: input.id,
        previousData: existing as unknown as Record<string, unknown>,
        ...reqInfo,
      });

      return { success: true };
    }),
});
