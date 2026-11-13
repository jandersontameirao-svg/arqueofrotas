import { z } from "zod";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { vehiclePhotos, vehicles } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog, getRequestInfo } from "../audit";
import { TRPCError } from "@trpc/server";
import { persistPhoto } from "../domain/evidence";

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
        // Foto enviada como data URL base64 (image/jpeg|png|webp). É persistida
        // no evidenceFiles e servida em /api/evidence/:id — igual às fotos de
        // ocorrência/checklist. O endpoint /api/upload não existe, por isso o
        // upload de foto de veículo não funcionava.
        photoData: z.string().min(1),
        photoFileName: z.string().max(255).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const reqInfo = getRequestInfo(ctx.req);

      // Persiste a imagem e gera a URL servível. decodePhoto valida tipo/tamanho.
      const stored = await persistPhoto(
        db,
        ctx.user.id,
        input.vehicleId,
        input.photoData,
        input.photoFileName
      );
      const photoUrl = stored.url;

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
            photoUrl,
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
          // Não gravar o base64 da foto no log de auditoria.
          newData: {
            vehicleId: input.vehicleId,
            photoType: input.photoType,
            photoUrl,
            description: input.description,
          } as Record<string, unknown>,
          ...reqInfo,
        });

        return { id: existing.id, updated: true };
      } else {
        // Criar
        const [result] = await db.insert(vehiclePhotos).values({
          vehicleId: input.vehicleId,
          photoType: input.photoType,
          photoUrl,
          description: input.description,
          uploadedById: ctx.user.id,
        });

        await createAuditLog({
          user: ctx.user,
          action: "CREATE",
          entityType: "vehicle",
          entityId: result.insertId,
          // Não gravar o base64 da foto no log de auditoria.
          newData: {
            vehicleId: input.vehicleId,
            photoType: input.photoType,
            photoUrl,
            description: input.description,
          } as Record<string, unknown>,
          ...reqInfo,
        });

        return { id: result.insertId, updated: false };
      }
    }),

  // Definir/trocar a foto de capa do veículo (imagem única do cabeçalho).
  // Independente das 5 fotos de ângulo; guarda só a URL em vehicles.coverPhotoUrl.
  setCover: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        photoData: z.string().min(1),
        photoFileName: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const stored = await persistPhoto(
        db,
        ctx.user.id,
        input.vehicleId,
        input.photoData,
        input.photoFileName
      );

      await db
        .update(vehicles)
        .set({ coverPhotoUrl: stored.url })
        .where(eq(vehicles.id, input.vehicleId));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "vehicle",
        entityId: input.vehicleId,
        newData: { coverPhotoUrl: stored.url } as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { coverPhotoUrl: stored.url };
    }),

  // Remover a foto de capa (volta ao ícone padrão).
  removeCover: gestorProcedure
    .input(z.object({ vehicleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(vehicles)
        .set({ coverPhotoUrl: null })
        .where(eq(vehicles.id, input.vehicleId));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "vehicle",
        entityId: input.vehicleId,
        newData: { coverPhotoUrl: null } as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
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
