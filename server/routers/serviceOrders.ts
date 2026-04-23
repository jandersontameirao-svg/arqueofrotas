import { z } from "zod";
import { eq, desc, and, ne, or, sql } from "drizzle-orm";
import { router, manutencaoProcedure, gestorProcedure, permissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  serviceOrders,
  serviceOrderItems,
  serviceOrderAttachments,
  serviceOrderApprovals,
  appNotifications,
  vehicles,
  users,
  maintenancePlans,
  occurrences,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { SERVICE_ORDER_STATUSES, MAINTENANCE_TYPES, SEVERITY_LEVELS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

export const serviceOrdersRouter = router({
  list: manutencaoProcedure
    .input(
      z.object({
        vehicleId: z.number().optional(),
        status: z.enum(SERVICE_ORDER_STATUSES).optional(),
        maintenanceType: z.enum(MAINTENANCE_TYPES).optional(),
        assignedToId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(serviceOrders.isDeleted, false), // Nunca exibir OS excluídas
      ];

      // Maintenance users only see assigned orders
      if (ctx.user.role === "manutencao") {
        conditions.push(eq(serviceOrders.assignedToId, ctx.user.id));
      } else if (input?.assignedToId) {
        conditions.push(eq(serviceOrders.assignedToId, input.assignedToId));
      }

      if (input?.vehicleId) {
        conditions.push(eq(serviceOrders.vehicleId, input.vehicleId));
      }
      if (input?.status) {
        conditions.push(eq(serviceOrders.status, input.status));
      }
      if (input?.maintenanceType) {
        conditions.push(eq(serviceOrders.maintenanceType, input.maintenanceType));
      }

      const result = await db
        .select({
          id: serviceOrders.id,
          osCode: serviceOrders.osCode,
          vehicleId: serviceOrders.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          maintenanceType: serviceOrders.maintenanceType,
          status: serviceOrders.status,
          description: serviceOrders.description,
          priority: serviceOrders.priority,
          openedAt: serviceOrders.openedAt,
          assignedToId: serviceOrders.assignedToId,
          assignedToName: users.name,
          startedAt: serviceOrders.startedAt,
          completedAt: serviceOrders.completedAt,
          supplierName: serviceOrders.supplierName,
          createdAt: serviceOrders.createdAt,
        })
        .from(serviceOrders)
        .innerJoin(vehicles, eq(serviceOrders.vehicleId, vehicles.id))
        .leftJoin(users, eq(serviceOrders.assignedToId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(serviceOrders.createdAt));

      return result;
    }),

  // List open service orders for dashboard
  listOpen: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        id: serviceOrders.id,
        osCode: serviceOrders.osCode,
        vehicleId: serviceOrders.vehicleId,
        vehiclePlate: vehicles.plate,
        vehicleModel: vehicles.model,
        maintenanceType: serviceOrders.maintenanceType,
        status: serviceOrders.status,
        description: serviceOrders.description,
        priority: serviceOrders.priority,
        openedAt: serviceOrders.openedAt,
        assignedToName: users.name,
        supplierName: serviceOrders.supplierName,
      })
      .from(serviceOrders)
      .innerJoin(vehicles, eq(serviceOrders.vehicleId, vehicles.id))
      .leftJoin(users, eq(serviceOrders.assignedToId, users.id))
      .where(
        and(
          eq(serviceOrders.isDeleted, false),
          ne(serviceOrders.status, "concluida"),
          ne(serviceOrders.status, "cancelada")
        )
      )
      .orderBy(desc(serviceOrders.priority), serviceOrders.openedAt);

    return result;
  }),

  getById: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select({
          id: serviceOrders.id,
          osCode: serviceOrders.osCode,
          vehicleId: serviceOrders.vehicleId,
          vehiclePlate: vehicles.plate,
          vehicleModel: vehicles.model,
          maintenanceType: serviceOrders.maintenanceType,
          maintenancePlanId: serviceOrders.maintenancePlanId,
          maintenancePlanName: maintenancePlans.name,
          occurrenceId: serviceOrders.occurrenceId,
          status: serviceOrders.status,
          description: serviceOrders.description,
          priority: serviceOrders.priority,
          openedAt: serviceOrders.openedAt,
          openedById: serviceOrders.openedById,
          assignedToId: serviceOrders.assignedToId,
          assignedToName: users.name,
          startedAt: serviceOrders.startedAt,
          completedAt: serviceOrders.completedAt,
          completedById: serviceOrders.completedById,
          supplierName: serviceOrders.supplierName,
          supplierContact: serviceOrders.supplierContact,
          kmAtOpen: serviceOrders.kmAtOpen,
          executionNotes: serviceOrders.executionNotes,
          createdAt: serviceOrders.createdAt,
          updatedAt: serviceOrders.updatedAt,
        })
        .from(serviceOrders)
        .innerJoin(vehicles, eq(serviceOrders.vehicleId, vehicles.id))
        .leftJoin(users, eq(serviceOrders.assignedToId, users.id))
        .leftJoin(maintenancePlans, eq(serviceOrders.maintenancePlanId, maintenancePlans.id))
        .where(and(eq(serviceOrders.id, input.id), eq(serviceOrders.isDeleted, false)))
        .limit(1);

      if (!so) return null;

      // Get items
      const items = await db
        .select()
        .from(serviceOrderItems)
        .where(eq(serviceOrderItems.serviceOrderId, input.id))
        .orderBy(serviceOrderItems.createdAt);

      // Get attachments
      const attachments = await db
        .select({
          id: serviceOrderAttachments.id,
          fileUrl: serviceOrderAttachments.fileUrl,
          fileName: serviceOrderAttachments.fileName,
          fileType: serviceOrderAttachments.fileType,
          description: serviceOrderAttachments.description,
          uploadedById: serviceOrderAttachments.uploadedById,
          createdAt: serviceOrderAttachments.createdAt,
        })
        .from(serviceOrderAttachments)
        .where(eq(serviceOrderAttachments.serviceOrderId, input.id))
        .orderBy(desc(serviceOrderAttachments.createdAt));

      return { ...so, items, attachments };
    }),

  create: gestorProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        maintenanceType: z.enum(MAINTENANCE_TYPES),
        maintenancePlanId: z.number().optional(),
        occurrenceId: z.number().optional(),
        description: z.string().min(1, "Descrição é obrigatória"),
        priority: z.enum(SEVERITY_LEVELS).default("media"),
        assignedToId: z.number().optional(),
        supplierName: z.string().optional(),
        supplierContact: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get vehicle current km
      const [vehicle] = await db
        .select({ currentKm: vehicles.currentKm, status: vehicles.status })
        .from(vehicles)
        .where(eq(vehicles.id, input.vehicleId))
        .limit(1);

      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo não encontrado",
        });
      }

      // Generate unique OS code: OS-NNNN/YYYY
      const currentYear = new Date().getFullYear();
      const [countResult] = await db
        .select({ count: serviceOrders.id })
        .from(serviceOrders)
        .where(and(
          eq(serviceOrders.openedAt, serviceOrders.openedAt) // Just to use the query builder
        ));
      
      // Count existing OS for this year to generate sequential number
      const existingCount = await db
        .select({ id: serviceOrders.id })
        .from(serviceOrders);
      const nextNumber = existingCount.length + 1;
      const osCode = `OS-${String(nextNumber).padStart(4, '0')}/${currentYear}`;

      const result = await db.insert(serviceOrders).values({
        ...input,
        osCode,
        status: "aberta",
        openedById: ctx.user.id,
        kmAtOpen: vehicle.currentKm,
      });
      const insertId = result[0].insertId;

      // Set vehicle to maintenance if not already
      if (vehicle.status !== "manutencao") {
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
          newData: { status: "manutencao", reason: "Ordem de serviço aberta" },
          ...getRequestInfo(ctx.req),
        });
      }

      // Link occurrence if provided
      if (input.occurrenceId) {
        await db
          .update(occurrences)
          .set({ serviceOrderId: insertId, status: "em_tratamento" })
          .where(eq(occurrences.id, input.occurrenceId));
      }

      await createAuditLog({
        user: ctx.user,
        action: "SERVICE_ORDER_OPEN",
        entityType: "service_order",
        entityId: insertId,
        newData: input as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { id: insertId, osCode };
    }),

  update: manutencaoProcedure
    .input(
      z.object({
        id: z.number(),
        description: z.string().optional(),
        priority: z.enum(SEVERITY_LEVELS).optional(),
        assignedToId: z.number().nullable().optional(),
        supplierName: z.string().optional(),
        supplierContact: z.string().optional(),
        executionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;

      // Get previous data
      const [previous] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, id))
        .limit(1);

      if (!previous) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem de serviço não encontrada",
        });
      }

      await db.update(serviceOrders).set(updateData).where(eq(serviceOrders.id, id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "service_order",
        entityId: id,
        previousData: previous as Record<string, unknown>,
        newData: updateData as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Start work on service order
  start: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.id))
        .limit(1);

      if (!so) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem de serviço não encontrada",
        });
      }

      if (so.status !== "aberta") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ordem de serviço não está aberta",
        });
      }

      await db
        .update(serviceOrders)
        .set({
          status: "em_andamento",
          startedAt: new Date(),
          assignedToId: so.assignedToId ?? ctx.user.id,
        })
        .where(eq(serviceOrders.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: so.status },
        newData: { status: "em_andamento" },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Complete service order
  complete: permissionProcedure("canCloseServiceOrder")
    .input(
      z.object({
        id: z.number(),
        executionNotes: z.string().optional(),
        releaseVehicle: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.id))
        .limit(1);

      if (!so) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem de serviço não encontrada",
        });
      }

      if (so.status === "concluida" || so.status === "cancelada") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ordem de serviço já está finalizada",
        });
      }

      await db
        .update(serviceOrders)
        .set({
          status: "concluida",
          completedAt: new Date(),
          completedById: ctx.user.id,
          executionNotes: input.executionNotes ?? so.executionNotes,
        })
        .where(eq(serviceOrders.id, input.id));

      // Release vehicle if requested
      if (input.releaseVehicle) {
        // Check if there are other open service orders for this vehicle
        const otherOpenSOs = await db
          .select({ id: serviceOrders.id })
          .from(serviceOrders)
          .where(
            and(
              eq(serviceOrders.vehicleId, so.vehicleId),
              ne(serviceOrders.id, input.id),
              or(
                eq(serviceOrders.status, "aberta"),
                eq(serviceOrders.status, "em_andamento"),
                eq(serviceOrders.status, "aguardando_pecas")
              )
            )
          )
          .limit(1);

        if (otherOpenSOs.length === 0) {
          await db
            .update(vehicles)
            .set({ status: "ativo" })
            .where(eq(vehicles.id, so.vehicleId));

          await createAuditLog({
            user: ctx.user,
            action: "STATUS_CHANGE",
            entityType: "vehicle",
            entityId: so.vehicleId,
            previousData: { status: "manutencao" },
            newData: { status: "ativo", reason: "Ordem de serviço concluída" },
            ...getRequestInfo(ctx.req),
          });
        }
      }

      // Close linked occurrence if exists
      if (so.occurrenceId) {
        await db
          .update(occurrences)
          .set({
            status: "encerrado",
            closedAt: new Date(),
            closedById: ctx.user.id,
            closureNotes: "Encerrado automaticamente com a conclusão da OS",
          })
          .where(eq(occurrences.id, so.occurrenceId));
      }

      await createAuditLog({
        user: ctx.user,
        action: "SERVICE_ORDER_CLOSE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: so.status },
        newData: { status: "concluida", executionNotes: input.executionNotes },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Cancel service order
  cancel: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "Motivo é obrigatório"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.id))
        .limit(1);

      if (!so) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem de serviço não encontrada",
        });
      }

      await db
        .update(serviceOrders)
        .set({
          status: "cancelada",
          executionNotes: `${so.executionNotes ?? ""}\nCancelamento: ${input.reason}`.trim(),
        })
        .where(eq(serviceOrders.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: so.status },
        newData: { status: "cancelada", reason: input.reason },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Delete service order (exclusão lógica real - diferente de cancelar)
  delete: gestorProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "Motivo é obrigatório"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(and(eq(serviceOrders.id, input.id), eq(serviceOrders.isDeleted, false)))
        .limit(1);

      if (!so) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ordem de serviço não encontrada",
        });
      }

      await db
        .update(serviceOrders)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedById: ctx.user.id,
          executionNotes: `${so.executionNotes ?? ""}\nExcluído por ${ctx.user.name}: ${input.reason}`.trim(),
        })
        .where(eq(serviceOrders.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: so.status, osCode: so.osCode },
        newData: { isDeleted: true, reason: input.reason, deletedById: ctx.user.id },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Add item (part or service)
  addItem: manutencaoProcedure
    .input(
      z.object({
        serviceOrderId: z.number(),
        itemType: z.enum(["peca", "servico"]),
        description: z.string().min(1, "Descrição é obrigatória"),
        quantity: z.string().default("1"),
        unitPrice: z.string().optional(),
        totalPrice: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(serviceOrderItems).values(input);

      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "service_order_item",
        entityId: result[0].insertId,
        newData: input as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { id: result[0].insertId };
    }),

  // Remove item
  removeItem: manutencaoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [item] = await db
        .select()
        .from(serviceOrderItems)
        .where(eq(serviceOrderItems.id, input.id))
        .limit(1);

      await db.delete(serviceOrderItems).where(eq(serviceOrderItems.id, input.id));

      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "service_order_item",
        entityId: input.id,
        previousData: item as Record<string, unknown>,
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Add attachment
  addAttachment: manutencaoProcedure
    .input(
      z.object({
        serviceOrderId: z.number(),
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
      const key = `service-orders/${input.serviceOrderId}/${Date.now()}-${input.fileName}`;
      const uploadResult = await storagePut(key, buffer, input.fileType ?? "application/octet-stream");

      const result = await db.insert(serviceOrderAttachments).values({
        serviceOrderId: input.serviceOrderId,
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
        entityType: "service_order_attachment",
        entityId: result[0].insertId,
        newData: { serviceOrderId: input.serviceOrderId, fileName: input.fileName },
        ...getRequestInfo(ctx.req),
      });

      return { id: result[0].insertId, url: uploadResult.url };
    }),

  // Submit OS for approval
  submitForApproval: gestorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.id))
        .limit(1);

      if (!so) {
        throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada" });
      }

      if (so.status !== "rascunho" && so.status !== "aberta") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "OS não pode ser enviada para aprovação neste status" });
      }

      await db
        .update(serviceOrders)
        .set({ status: "pendente_aprovacao" })
        .where(eq(serviceOrders.id, input.id));

      // Create approval record
      await db.insert(serviceOrderApprovals).values({
        serviceOrderId: input.id,
        action: "pendente",
        userId: ctx.user.id,
        notes: "OS enviada para aprovação",
      });

      // Notify all gestores and admins
      const gestores = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.active, true),
          or(
            eq(users.role, "admin"),
            eq(users.role, "gestor_frota")
          )
        ));

      for (const gestor of gestores) {
        if (gestor.id !== ctx.user.id) {
          await db.insert(appNotifications).values({
            userId: gestor.id,
            type: "os_pendente_aprovacao",
            title: `OS ${so.osCode} aguarda aprovação`,
            message: `A ordem de serviço ${so.osCode} foi enviada para aprovação por ${ctx.user.name}.`,
            entityType: "service_order",
            entityId: input.id,
          });
        }
      }

      await createAuditLog({
        user: ctx.user,
        action: "STATUS_CHANGE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: so.status },
        newData: { status: "pendente_aprovacao" },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Approve OS
  approve: gestorProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.id))
        .limit(1);

      if (!so) {
        throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada" });
      }

      if (so.status !== "pendente_aprovacao") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "OS não está pendente de aprovação" });
      }

      await db
        .update(serviceOrders)
        .set({
          status: "aprovada",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes: input.notes,
        })
        .where(eq(serviceOrders.id, input.id));

      await db.insert(serviceOrderApprovals).values({
        serviceOrderId: input.id,
        action: "aprovado",
        userId: ctx.user.id,
        notes: input.notes,
      });

      // Notify the opener
      if (so.openedById) {
        await db.insert(appNotifications).values({
          userId: so.openedById,
          type: "os_aprovada",
          title: `OS ${so.osCode} foi aprovada`,
          message: `A ordem de serviço ${so.osCode} foi aprovada por ${ctx.user.name}.${input.notes ? ` Obs: ${input.notes}` : ""}`,
          entityType: "service_order",
          entityId: input.id,
        });
      }

      await createAuditLog({
        user: ctx.user,
        action: "STATUS_CHANGE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: "pendente_aprovacao" },
        newData: { status: "aprovada", approvedById: ctx.user.id, notes: input.notes },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Reject OS
  reject: gestorProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().min(1, "Motivo da rejeição é obrigatório"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [so] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, input.id))
        .limit(1);

      if (!so) {
        throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada" });
      }

      if (so.status !== "pendente_aprovacao") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "OS não está pendente de aprovação" });
      }

      await db
        .update(serviceOrders)
        .set({
          status: "rejeitada",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes: input.notes,
        })
        .where(eq(serviceOrders.id, input.id));

      await db.insert(serviceOrderApprovals).values({
        serviceOrderId: input.id,
        action: "rejeitado",
        userId: ctx.user.id,
        notes: input.notes,
      });

      // Notify the opener
      if (so.openedById) {
        await db.insert(appNotifications).values({
          userId: so.openedById,
          type: "os_rejeitada",
          title: `OS ${so.osCode} foi rejeitada`,
          message: `A ordem de serviço ${so.osCode} foi rejeitada por ${ctx.user.name}. Motivo: ${input.notes}`,
          entityType: "service_order",
          entityId: input.id,
        });
      }

      await createAuditLog({
        user: ctx.user,
        action: "STATUS_CHANGE",
        entityType: "service_order",
        entityId: input.id,
        previousData: { status: "pendente_aprovacao" },
        newData: { status: "rejeitada", notes: input.notes },
        ...getRequestInfo(ctx.req),
      });

      return { success: true };
    }),

  // Get approval history for an OS
  getApprovalHistory: manutencaoProcedure
    .input(z.object({ serviceOrderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select({
          id: serviceOrderApprovals.id,
          action: serviceOrderApprovals.action,
          userId: serviceOrderApprovals.userId,
          userName: users.name,
          notes: serviceOrderApprovals.notes,
          createdAt: serviceOrderApprovals.createdAt,
        })
        .from(serviceOrderApprovals)
        .leftJoin(users, eq(serviceOrderApprovals.userId, users.id))
        .where(eq(serviceOrderApprovals.serviceOrderId, input.serviceOrderId))
        .orderBy(desc(serviceOrderApprovals.createdAt));

      return result;
    }),

  // Get statistics for dashboard
  stats: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allSOs = await db
      .select({
        status: serviceOrders.status,
        maintenanceType: serviceOrders.maintenanceType,
        openedAt: serviceOrders.openedAt,
        completedAt: serviceOrders.completedAt,
      })
      .from(serviceOrders)
      .where(eq(serviceOrders.isDeleted, false));

    const total = allSOs.length;
    const abertas = allSOs.filter((so) => so.status === "aberta").length;
    const emAndamento = allSOs.filter((so) => so.status === "em_andamento").length;
    const aguardandoPecas = allSOs.filter((so) => so.status === "aguardando_pecas").length;
    const concluidas = allSOs.filter((so) => so.status === "concluida").length;
    const preventivas = allSOs.filter((so) => so.maintenanceType === "preventiva").length;
    const corretivas = allSOs.filter((so) => so.maintenanceType === "corretiva").length;

    // Calculate average completion time for completed orders
    const completedSOs = allSOs.filter((so) => so.status === "concluida" && so.completedAt && so.openedAt);
    let avgCompletionDays = 0;
    if (completedSOs.length > 0) {
      const totalDays = completedSOs.reduce((sum, so) => {
        const diff = new Date(so.completedAt!).getTime() - new Date(so.openedAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedSOs.length);
    }

    return {
      total,
      abertas,
      emAndamento,
      aguardandoPecas,
      concluidas,
      preventivas,
      corretivas,
      avgCompletionDays,
    };
  }),
});
