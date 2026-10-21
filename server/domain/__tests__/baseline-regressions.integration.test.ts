import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import * as s from "../../../drizzle/schema";
import { fixture, caller, meta, isolatedDatabase } from "./fixtures";
const enabled = isolatedDatabase();
describe.skipIf(!enabled)(
  "Regressions reproducible on the supplied baseline",
  () => {
    it("rejects an inactive user even with a valid existing context", async () => {
      const f = await fixture();
      await expect(
        caller({ ...f.people.motorista, active: false }).vehicles.list()
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
    it("rejects an incomplete checklist on the server", async () => {
      const f = await fixture();
      await expect(
        f.driver.checklists.submit({
          vehicleId: f.vehicleId,
          templateId: f.templateId,
          responses: [],
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
    it("rejects a critical nonconformity without evidence", async () => {
      const f = await fixture();
      await expect(
        f.driver.checklists.submit({
          vehicleId: f.vehicleId,
          templateId: f.templateId,
          responses: [{ templateItemId: f.itemId, response: "nao_ok" }],
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
    it("rejects a regressive checklist odometer reading", async () => {
      const f = await fixture();
      await expect(
        f.driver.checklists.submit({
          vehicleId: f.vehicleId,
          ...f.inspection,
          km: 90,
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
    it("prevents reading another driver checklist by ID", async () => {
      const f = await fixture();
      const record = await f.driver.checklists.submit({
        vehicleId: f.vehicleId,
        ...f.inspection,
        ...meta(),
      });
      await expect(
        caller(f.other).checklists.getById({ id: record.id })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
    it("keeps another critical occurrence blocking after OS completion", async () => {
      const f = await fixture();
      await f.db
        .insert(s.occurrences)
        .values({
          vehicleId: f.vehicleId,
          reportedById: f.people.motorista.id,
          description: "Restrição crítica independente",
          severity: "alta",
          occurredAt: new Date(),
        });
      const order = await f.manager.serviceOrders.create({
        vehicleId: f.vehicleId,
        description: "Reparo",
        maintenanceType: "corretiva",
        assignedToId: f.people.manutencao.id,
      });
      await f.maintenance.serviceOrders.start({ id: order.id });
      await f.maintenance.serviceOrders.complete({
        id: order.id,
        executionNotes: "Executado",
        releaseVehicle: true,
      });
      const [vehicle] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(vehicle.status).toBe("manutencao");
    });
  }
);
