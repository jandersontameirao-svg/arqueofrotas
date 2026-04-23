import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Feature routers
import { unitsRouter } from "./routers/units";
import { projectsRouter } from "./routers/projects";
import { usersRouter } from "./routers/users";
import { vehiclesRouter } from "./routers/vehicles";
import { vehicleDocumentsRouter } from "./routers/vehicleDocuments";
import { checklistTemplatesRouter } from "./routers/checklistTemplates";
import { checklistsRouter } from "./routers/checklists";
import { occurrencesRouter } from "./routers/occurrences";
import { serviceOrdersRouter } from "./routers/serviceOrders";
import { maintenancePlansRouter } from "./routers/maintenancePlans";
import { auditLogsRouter } from "./routers/auditLogs";
import { dashboardRouter } from "./routers/dashboard";
import { vehiclePhotosRouter } from "./routers/vehiclePhotos";
import { serviceProvidersRouter } from "./routers/serviceProviders";
import { vehicleFinesRouter } from "./routers/vehicleFines";
import { notificationsRouter } from "./routers/notifications";
import { vehicleAIRouter } from "./routers/vehicleAI";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  units: unitsRouter,
  projects: projectsRouter,
  users: usersRouter,
  vehicles: vehiclesRouter,
  vehicleDocuments: vehicleDocumentsRouter,
  checklistTemplates: checklistTemplatesRouter,
  checklists: checklistsRouter,
  occurrences: occurrencesRouter,
  serviceOrders: serviceOrdersRouter,
  maintenancePlans: maintenancePlansRouter,
  auditLogs: auditLogsRouter,
  dashboard: dashboardRouter,
  vehiclePhotos: vehiclePhotosRouter,
  serviceProviders: serviceProvidersRouter,
  vehicleFines: vehicleFinesRouter,
  notifications: notificationsRouter,
  vehicleAI: vehicleAIRouter,
});

export type AppRouter = typeof appRouter;
