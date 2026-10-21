import { z } from "zod";
import { permissionProcedure, router } from "../_core/trpc";
import { vehiclesRouter } from "./vehicles";
import { occurrencesRouter } from "./occurrences";
import { serviceOrdersRouter } from "./serviceOrders";
import {
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  OCCURRENCE_STATUSES,
  SEVERITY_LEVELS,
  SERVICE_ORDER_STATUSES,
  MAINTENANCE_TYPES,
} from "../../shared/const";
import { csvDocument } from "../domain/reports";
const input = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("vehicles"),
    filters: z
      .object({
        status: z.enum(VEHICLE_STATUSES).optional(),
        vehicleType: z.enum(VEHICLE_TYPES).optional(),
        unitId: z.number().int().positive().optional(),
        search: z.string().optional(),
      })
      .default({}),
  }),
  z.object({
    entity: z.literal("occurrences"),
    filters: z
      .object({
        vehicleId: z.number().int().positive().optional(),
        status: z.enum(OCCURRENCE_STATUSES).optional(),
        severity: z.enum(SEVERITY_LEVELS).optional(),
      })
      .default({}),
  }),
  z.object({
    entity: z.literal("serviceOrders"),
    filters: z
      .object({
        vehicleId: z.number().int().positive().optional(),
        status: z.enum(SERVICE_ORDER_STATUSES).optional(),
        maintenanceType: z.enum(MAINTENANCE_TYPES).optional(),
      })
      .default({}),
  }),
]);
export const reportsRouter = router({
  authorize: permissionProcedure("canExportReports").query(() => ({
    allowed: true as const,
  })),
  csv: permissionProcedure("canExportReports")
    .input(input)
    .query(async ({ input, ctx }) => {
      const rows =
        input.entity === "vehicles"
          ? await vehiclesRouter.createCaller(ctx).list(input.filters)
          : input.entity === "occurrences"
            ? await occurrencesRouter.createCaller(ctx).list(input.filters)
            : await serviceOrdersRouter.createCaller(ctx).list(input.filters);
      const generatedAt = new Date();
      return {
        filename: `arqueofrotas-${input.entity}.csv`,
        mimeType: "text/csv;charset=utf-8",
        content: csvDocument(rows),
        generatedAt,
        filters: input.filters,
        rowCount: rows.length,
      };
    }),
});
