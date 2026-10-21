import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, gestorProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  reservations,
  vehicles,
  projects,
  users,
  occurrences,
  occurrenceAttachments,
  activeVehicleUses,
  checklists,
} from "../../drizzle/schema";
import {
  vehicleEligibility,
  validateInterval,
  reconcileVehicle,
} from "../domain/eligibility";
import { checklistInput, submitChecklist } from "../domain/checklists";
import { recordKm } from "../domain/odometer";
import { persistPhoto } from "../domain/evidence";

const metadata = {
  requestId: z.string().min(8).max(100),
  idempotencyKey: z.string().min(8).max(100),
};
const inspection = checklistInput.omit({
  vehicleId: true,
  km: true,
  requestId: true,
  idempotencyKey: true,
  collectedAt: true,
});
const fuel = z.number().int().min(0).max(100);
const problem = z.object({
  description: z.string().trim().min(3).max(10000),
  severity: z.enum(["baixa", "media", "alta"]),
  photoData: z.string().max(12000000).optional(),
  photoFileName: z.string().max(255).optional(),
});
const dbRequired = async () => {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco indisponível",
    });
  return db;
};

export const reservationsRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbRequired();
    return db
      .select()
      .from(reservations)
      .where(eq(reservations.userId, ctx.user.id))
      .orderBy(desc(reservations.createdAt));
  }),
  list: gestorProcedure.query(async () =>
    (await dbRequired())
      .select()
      .from(reservations)
      .orderBy(desc(reservations.createdAt))
  ),
  create: gestorProcedure
    .input(
      z.object({
        ...metadata,
        vehicleId: z.number().int().positive(),
        userId: z.number().int().positive(),
        projectId: z.number().int().positive(),
        startDate: z.date(),
        endDate: z.date(),
        purpose: z.string().max(10000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await dbRequired();
      validateInterval(input.startDate, input.endDate);
      const state = await vehicleEligibility(
        db,
        input.vehicleId,
        input.startDate,
        input.endDate
      );
      if (!state.eligible)
        throw new TRPCError({
          code: "CONFLICT",
          message: `Veículo indisponível: ${state.reasons.join(", ")}`,
        });
      const [driver] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId));
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));
      if (!driver?.active || !project?.active)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Condutor e projeto devem estar ativos",
        });
      const { requestId, idempotencyKey, ...values } = input;
      const result = await db.insert(reservations).values(values);
      return { id: result[0].insertId, status: "agendada" as const };
    }),
  cancel: protectedProcedure
    .input(
      z.object({
        ...metadata,
        id: z.number().int().positive(),
        reason: z.string().trim().min(3).max(1000),
      })
    )
    .mutation(async ({ input }) => {
      const db = await dbRequired();
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.id));
      if (!reservation || reservation.status !== "agendada")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Só uma reserva agendada pode ser cancelada",
        });
      await db
        .update(reservations)
        .set({ status: "cancelada", observations: input.reason })
        .where(eq(reservations.id, input.id));
      return { id: input.id, status: "cancelada" as const };
    }),
  pickup: protectedProcedure
    .input(
      z.object({
        ...metadata,
        vehicleId: z.number().int().positive(),
        reservationId: z.number().int().positive().optional(),
        projectId: z.number().int().positive().optional(),
        endDate: z.date(),
        km: z.number().int().min(0),
        fuel,
        inspection,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await dbRequired();
      const now = new Date();
      validateInterval(now, input.endDate);
      const active = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.userId, ctx.user.id),
            eq(reservations.status, "em_uso")
          )
        );
      if (active.length)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Você já possui um veículo em uso",
        });
      let booking;
      if (input.reservationId) {
        [booking] = await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId));
        if (
          !booking ||
          booking.vehicleId !== input.vehicleId ||
          booking.userId !== ctx.user.id ||
          booking.status !== "agendada" ||
          now < booking.startDate ||
          now >= booking.endDate ||
          input.endDate > booking.endDate
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "Reserva não autoriza esta retirada ou intervalo",
          });
      }
      const state = await vehicleEligibility(
        db,
        input.vehicleId,
        now,
        input.endDate,
        booking?.id
      );
      if (!state.eligible)
        throw new TRPCError({
          code: "CONFLICT",
          message: `Retirada não confirmada: ${state.reasons.join(", ")}`,
        });
      const projectId =
        booking?.projectId ??
        input.projectId ??
        state.vehicle?.defaultProjectId;
      if (!projectId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione um projeto para esta operação",
        });
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));
      if (!project?.active)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Projeto inativo ou inexistente",
        });
      const checklist = await submitChecklist(db, ctx.user, {
        ...input.inspection,
        vehicleId: input.vehicleId,
        km: input.km,
        collectedAt: now,
      });
      if (checklist.critical)
        return {
          status: "blocked" as const,
          checklistId: checklist.id,
          message:
            "Inspeção registrada com ocorrência crítica. Não retire o veículo.",
        };
      const values = {
        vehicleId: input.vehicleId,
        userId: ctx.user.id,
        projectId,
        startDate: now,
        endDate: input.endDate,
        status: "em_uso" as const,
        checkInAt: now,
        checkInKm: input.km,
        checkInFuel: input.fuel,
        checklistId: checklist.id,
      };
      let id = booking?.id;
      if (id)
        await db
          .update(reservations)
          .set(values)
          .where(eq(reservations.id, id));
      else {
        const result = await db.insert(reservations).values(values);
        id = result[0].insertId;
      }
      await db
        .update(checklists)
        .set({ reservationId: id })
        .where(eq(checklists.id, checklist.id));
      await db
        .insert(activeVehicleUses)
        .values({
          vehicleId: input.vehicleId,
          userId: ctx.user.id,
          reservationId: id!,
        });
      return { id, status: "em_uso" as const, confirmedAt: now };
    }),
  return: protectedProcedure
    .input(
      z.object({
        ...metadata,
        id: z.number().int().positive(),
        km: z.number().int().min(0),
        fuel,
        collectedAt: z.date(),
        inspection,
        problem: problem.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await dbRequired();
      const [booking] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, input.id));
      if (
        !booking ||
        booking.status !== "em_uso" ||
        booking.userId !== ctx.user.id
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "Uso ativo não encontrado para o motorista",
        });
      if (
        input.collectedAt.getTime() > Date.now() + 300000 ||
        input.collectedAt < (booking.checkInAt ?? booking.startDate)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Horário de devolução inválido",
        });
      if (input.km < (booking.checkInKm ?? 0))
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Leitura final inferior à retirada; solicite correção ao gestor",
        });
      const checklist = await submitChecklist(db, ctx.user, {
        ...input.inspection,
        vehicleId: booking.vehicleId,
        km: input.km,
        collectedAt: input.collectedAt,
      });
      if (input.problem)
        await report(
          db,
          ctx.user.id,
          booking.vehicleId,
          input.collectedAt,
          input.problem
        );
      await db
        .update(reservations)
        .set({
          status: "concluida",
          checkOutAt: input.collectedAt,
          checkOutKm: input.km,
          checkOutFuel: input.fuel,
          returnChecklistId: checklist.id,
        })
        .where(eq(reservations.id, booking.id));
      await db
        .delete(activeVehicleUses)
        .where(eq(activeVehicleUses.vehicleId, booking.vehicleId));
      const state = await reconcileVehicle(db, booking.vehicleId);
      return {
        id: booking.id,
        status: "concluida" as const,
        distanceKm: input.km - (booking.checkInKm ?? input.km),
        available: state.eligible,
        reasons: state.reasons,
        receivedAt: new Date(),
      };
    }),
  reportProblem: protectedProcedure
    .input(
      z.object({
        ...metadata,
        vehicleId: z.number().int().positive(),
        collectedAt: z.date(),
        ...problem.shape,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await dbRequired();
      if (input.collectedAt.getTime() > Date.now() + 300000)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Horário da coleta no futuro",
        });
      return report(db, ctx.user.id, input.vehicleId, input.collectedAt, input);
    }),
});
async function report(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  vehicleId: number,
  collectedAt: Date,
  input: z.infer<typeof problem>
) {
  const result = await db
    .insert(occurrences)
    .values({
      vehicleId,
      reportedById: userId,
      occurredAt: collectedAt,
      description: input.description,
      severity: input.severity,
      status: "aberto",
    });
  const id = result[0].insertId;
  if (input.photoData) {
    const photo = await persistPhoto(
      db,
      userId,
      vehicleId,
      input.photoData,
      input.photoFileName
    );
    await db
      .insert(occurrenceAttachments)
      .values({
        occurrenceId: id,
        fileUrl: photo.url,
        fileName: photo.fileName,
        fileType: photo.mimeType,
        fileSize: photo.size,
        uploadedById: userId,
      });
  }
  if (input.severity === "alta")
    await db
      .update(vehicles)
      .set({ status: "manutencao" })
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.status, "ativo")));
  return { id, status: "aberto" as const, receivedAt: new Date() };
}
