import { z } from "zod";
import { eq, desc, and, gte, lte, ne, or, sql } from "drizzle-orm";
import { router, gestorProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  vehicles,
  reservations,
  checklists,
  occurrences,
  serviceOrders,
  vehicleDocuments,
  vehicleMaintenanceStatus,
} from "../../drizzle/schema";

export const dashboardRouter = router({
  // Main dashboard stats for gestor/admin
  getStats: gestorProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Vehicle stats
    const allVehicles = await db
      .select({ status: vehicles.status })
      .from(vehicles)
      .where(eq(vehicles.active, true));

    const vehicleStats = {
      total: allVehicles.length,
      ativos: allVehicles.filter(v => v.status === "ativo").length,
      emManutencao: allVehicles.filter(v => v.status === "manutencao").length,
      baixados: allVehicles.filter(v => v.status === "baixado").length,
      disponibilidade:
        allVehicles.length > 0
          ? Math.round(
              (allVehicles.filter(v => v.status === "ativo").length /
                allVehicles.length) *
                100
            )
          : 0,
    };

    // Today's checklist stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayChecklists = await db
      .select({ hasIssues: checklists.hasIssues })
      .from(checklists)
      .where(
        and(
          gte(checklists.executedAt, today),
          lte(checklists.executedAt, tomorrow)
        )
      );

    const checklistStats = {
      hoje: todayChecklists.length,
      comProblemas: todayChecklists.filter(c => c.hasIssues).length,
      conformidade:
        todayChecklists.length > 0
          ? Math.round(
              ((todayChecklists.length -
                todayChecklists.filter(c => c.hasIssues).length) /
                todayChecklists.length) *
                100
            )
          : 100,
    };

    // Open occurrences
    const openOccurrences = await db
      .select({ severity: occurrences.severity })
      .from(occurrences)
      .where(ne(occurrences.status, "encerrado"));

    const occurrenceStats = {
      abertas: openOccurrences.length,
      alta: openOccurrences.filter(o => o.severity === "alta").length,
      media: openOccurrences.filter(o => o.severity === "media").length,
      baixa: openOccurrences.filter(o => o.severity === "baixa").length,
    };

    // Open service orders
    const openSOs = await db
      .select({ status: serviceOrders.status })
      .from(serviceOrders)
      .where(
        and(
          ne(serviceOrders.status, "concluida"),
          ne(serviceOrders.status, "cancelada")
        )
      );

    const serviceOrderStats = {
      abertas: openSOs.filter(so => so.status === "aberta").length,
      emAndamento: openSOs.filter(so => so.status === "em_andamento").length,
      aguardandoPecas: openSOs.filter(so => so.status === "aguardando_pecas")
        .length,
      total: openSOs.length,
    };

    // Documents expiring
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const expiringDocs = await db
      .select({ expirationDate: vehicleDocuments.expirationDate })
      .from(vehicleDocuments)
      .innerJoin(vehicles, eq(vehicleDocuments.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicles.active, true),
          lte(vehicleDocuments.expirationDate, in30Days)
        )
      );

    const documentStats = {
      vencidos: expiringDocs.filter(
        d => d.expirationDate && d.expirationDate <= today
      ).length,
      aVencer: expiringDocs.filter(
        d => d.expirationDate && d.expirationDate > today
      ).length,
    };

    // Maintenance alerts
    const maintenanceAlerts = await db
      .select({ status: vehicleMaintenanceStatus.status })
      .from(vehicleMaintenanceStatus)
      .where(ne(vehicleMaintenanceStatus.status, "em_dia"));

    const maintenanceStats = {
      aVencer: maintenanceAlerts.filter(m => m.status === "a_vencer").length,
      vencidas: maintenanceAlerts.filter(m => m.status === "vencida").length,
    };

    return {
      vehicles: vehicleStats,
      checklists: checklistStats,
      occurrences: occurrenceStats,
      serviceOrders: serviceOrderStats,
      documents: documentStats,
      maintenance: maintenanceStats,
    };
  }),

  // Dashboard for motorista
  getMotoristaStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // My active reservations
    const myReservations = await db
      .select({
        id: reservations.id,
        status: reservations.status,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, ctx.user.id),
          or(
            eq(reservations.status, "agendada"),
            eq(reservations.status, "em_uso")
          )
        )
      );

    // Today's checklist status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayChecklists = await db
      .select({ vehicleId: checklists.vehicleId })
      .from(checklists)
      .where(
        and(
          eq(checklists.userId, ctx.user.id),
          gte(checklists.executedAt, today),
          lte(checklists.executedAt, tomorrow)
        )
      );

    // My open occurrences
    const myOccurrences = await db
      .select({ id: occurrences.id })
      .from(occurrences)
      .where(
        and(
          eq(occurrences.reportedById, ctx.user.id),
          ne(occurrences.status, "encerrado")
        )
      );

    return {
      reservasAtivas: myReservations.length,
      reservasEmUso: myReservations.filter(r => r.status === "em_uso").length,
      checklistsHoje: todayChecklists.length,
      ocorrenciasAbertas: myOccurrences.length,
    };
  }),

  // Recent activity
  getRecentActivity: gestorProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(10) }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = input?.limit ?? 10;

      // Get recent checklists
      const recentChecklists = await db
        .select({
          id: checklists.id,
          type: sql<string>`'checklist'`.as("type"),
          vehiclePlate: vehicles.plate,
          description: sql<string>`CONCAT('Checklist executado')`.as(
            "description"
          ),
          createdAt: checklists.createdAt,
        })
        .from(checklists)
        .innerJoin(vehicles, eq(checklists.vehicleId, vehicles.id))
        .orderBy(desc(checklists.createdAt))
        .limit(limit);

      // Get recent occurrences
      const recentOccurrences = await db
        .select({
          id: occurrences.id,
          type: sql<string>`'occurrence'`.as("type"),
          vehiclePlate: vehicles.plate,
          description: occurrences.description,
          createdAt: occurrences.createdAt,
        })
        .from(occurrences)
        .innerJoin(vehicles, eq(occurrences.vehicleId, vehicles.id))
        .orderBy(desc(occurrences.createdAt))
        .limit(limit);

      // Get recent service orders
      const recentSOs = await db
        .select({
          id: serviceOrders.id,
          type: sql<string>`'service_order'`.as("type"),
          vehiclePlate: vehicles.plate,
          description: serviceOrders.description,
          createdAt: serviceOrders.createdAt,
        })
        .from(serviceOrders)
        .innerJoin(vehicles, eq(serviceOrders.vehicleId, vehicles.id))
        .orderBy(desc(serviceOrders.createdAt))
        .limit(limit);

      // Combine and sort
      const allActivity = [
        ...recentChecklists.map(c => ({ ...c, type: "checklist" as const })),
        ...recentOccurrences.map(o => ({ ...o, type: "occurrence" as const })),
        ...recentSOs.map(so => ({ ...so, type: "service_order" as const })),
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit);

      return allActivity;
    }),

  // Vehicle timeline
  getVehicleTimeline: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get reservations
      const vehicleReservations = await db
        .select({
          id: reservations.id,
          type: sql<string>`'reservation'`.as("type"),
          date: reservations.startDate,
          description:
            sql<string>`CONCAT('Reserva: ', reservations.purpose)`.as(
              "description"
            ),
          status: reservations.status,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.vehicleId, input.vehicleId),
            ctx.user.role === "motorista" || ctx.user.role === "manutencao"
              ? eq(reservations.userId, ctx.user.id)
              : undefined
          )
        )
        .orderBy(desc(reservations.startDate))
        .limit(input.limit);

      // Get checklists
      const vehicleChecklists = await db
        .select({
          id: checklists.id,
          type: sql<string>`'checklist'`.as("type"),
          date: checklists.executedAt,
          description: sql<string>`'Checklist executado'`.as("description"),
          hasIssues: checklists.hasIssues,
        })
        .from(checklists)
        .where(
          and(
            eq(checklists.vehicleId, input.vehicleId),
            eq(checklists.isDeleted, false),
            ctx.user.role === "motorista"
              ? eq(checklists.userId, ctx.user.id)
              : undefined
          )
        )
        .orderBy(desc(checklists.executedAt))
        .limit(input.limit);

      // Get occurrences
      const vehicleOccurrences = await db
        .select({
          id: occurrences.id,
          type: sql<string>`'occurrence'`.as("type"),
          date: occurrences.occurredAt,
          description: occurrences.description,
          severity: occurrences.severity,
          status: occurrences.status,
        })
        .from(occurrences)
        .where(
          and(
            eq(occurrences.vehicleId, input.vehicleId),
            eq(occurrences.isDeleted, false),
            ctx.user.role === "motorista"
              ? eq(occurrences.reportedById, ctx.user.id)
              : undefined
          )
        )
        .orderBy(desc(occurrences.occurredAt))
        .limit(input.limit);

      // Get service orders
      const vehicleSOs = await db
        .select({
          id: serviceOrders.id,
          type: sql<string>`'service_order'`.as("type"),
          date: serviceOrders.openedAt,
          description: serviceOrders.description,
          maintenanceType: serviceOrders.maintenanceType,
          status: serviceOrders.status,
        })
        .from(serviceOrders)
        .where(
          and(
            eq(serviceOrders.vehicleId, input.vehicleId),
            eq(serviceOrders.isDeleted, false),
            ctx.user.role === "motorista"
              ? sql`false`
              : ctx.user.role === "manutencao"
                ? eq(serviceOrders.assignedToId, ctx.user.id)
                : undefined
          )
        )
        .orderBy(desc(serviceOrders.openedAt))
        .limit(input.limit);

      // Combine and sort
      const timeline = [
        ...vehicleReservations.map(r => ({
          id: r.id,
          type: "reservation" as const,
          date: r.date,
          description: r.description,
          meta: { status: r.status },
        })),
        ...vehicleChecklists.map(c => ({
          id: c.id,
          type: "checklist" as const,
          date: c.date,
          description: c.description,
          meta: { hasIssues: c.hasIssues },
        })),
        ...vehicleOccurrences.map(o => ({
          id: o.id,
          type: "occurrence" as const,
          date: o.date,
          description: o.description,
          meta: { severity: o.severity, status: o.status },
        })),
        ...vehicleSOs.map(so => ({
          id: so.id,
          type: "service_order" as const,
          date: so.date,
          description: so.description,
          meta: { maintenanceType: so.maintenanceType, status: so.status },
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, input.limit);

      return timeline;
    }),
});
