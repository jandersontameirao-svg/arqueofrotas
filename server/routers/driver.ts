import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { and, eq, ne } from "drizzle-orm";
import {
  vehicles,
  projects,
  reservations,
  checklistTemplates,
  checklistTemplateItems,
  occurrences,
} from "../../drizzle/schema";
export const driverRouter = router({
  context: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco indisponível");
    const fleet = await db
      .select({
        id: vehicles.id,
        plate: vehicles.plate,
        model: vehicles.model,
        revision: vehicles.revision,
        currentKm: vehicles.currentKm,
        status: vehicles.status,
        vehicleType: vehicles.vehicleType,
        defaultProjectId: vehicles.defaultProjectId,
      })
      .from(vehicles)
      .where(eq(vehicles.active, true));
    const projectList = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.active, true));
    const bookings = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, ctx.user.id),
          ne(reservations.status, "cancelada"),
          ne(reservations.status, "concluida")
        )
      );
    const templates = await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.active, true));
    const items = await db
      .select()
      .from(checklistTemplateItems)
      .where(eq(checklistTemplateItems.active, true));
    // Only operational facts are shared across the fleet. No personal reports or attachment URLs.
    const knownIssues = await db
      .select({
        id: occurrences.id,
        vehicleId: occurrences.vehicleId,
        description: occurrences.description,
        severity: occurrences.severity,
      })
      .from(occurrences)
      .where(
        and(
          eq(occurrences.isDeleted, false),
          ne(occurrences.status, "encerrado")
        )
      );
    return {
      vehicles: fleet,
      projects: projectList,
      reservations: bookings,
      templates: templates.map(t => ({
        ...t,
        items: items.filter(i => i.templateId === t.id),
      })),
      knownIssues,
      receivedAt: new Date(),
    };
  }),
});
