import { describe, it, expect } from "vitest";
import { and, eq } from "drizzle-orm";
import * as s from "../../../drizzle/schema";
import { fixture, caller, meta, png, isolatedDatabase } from "./fixtures";
const enabled = isolatedDatabase();
describe.skipIf(!enabled)(
  "Essential flows on isolated MySQL-compatible database",
  () => {
    it("revokes all role procedures for an inactive account", async () => {
      const f = await fixture();
      for (const role of ["admin", "gestor_frota", "motorista", "manutencao"]) {
        const c = caller({ ...f.people[role], active: false });
        await expect(c.vehicles.list()).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
        await expect(c.users.list()).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
        await expect(c.serviceOrders.list()).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
      }
    });
    it("checks revocation inside an existing write session", async () => {
      const f = await fixture();
      await f.db
        .update(s.users)
        .set({ active: false })
        .where(eq(s.users.id, f.people.motorista.id));
      await expect(
        f.driver.checklists.submit({
          vehicleId: f.vehicleId,
          ...f.inspection,
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
    it("rejects incomplete, duplicate, foreign and inapplicable checklist items without partial writes", async () => {
      const f = await fixture();
      const base = {
        vehicleId: f.vehicleId,
        templateId: f.templateId,
        km: 101,
      };
      for (const responses of [
        [],
        [...f.inspection.responses, ...f.inspection.responses],
        [{ templateItemId: f.itemId + 9999, response: "ok" as const }],
      ])
        await expect(
          f.driver.checklists.submit({ ...base, responses, ...meta() })
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await f.db
        .update(s.checklistTemplates)
        .set({ vehicleType: "moto" })
        .where(eq(s.checklistTemplates.id, f.templateId));
      await expect(
        f.driver.checklists.submit({
          ...base,
          responses: f.inspection.responses,
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await f.db
          .select()
          .from(s.checklists)
          .where(eq(s.checklists.vehicleId, f.vehicleId))
      ).toHaveLength(0);
      const [v] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(v.currentKm).toBe(100);
    });
    it("requires evidence and persists a data URL without a supplied filename exactly once", async () => {
      const f = await fixture();
      const base = {
        vehicleId: f.vehicleId,
        templateId: f.templateId,
        km: 101,
      };
      const response = {
        templateItemId: f.itemId,
        response: "nao_ok" as const,
      };
      await expect(
        f.driver.checklists.submit({
          ...base,
          responses: [response],
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      const command = {
        ...base,
        responses: [{ ...response, photoData: `data:image/png;base64,${png}` }],
        ...meta(),
      };
      const first = await f.driver.checklists.submit(command);
      const second = await f.driver.checklists.submit(command);
      expect(second).toEqual(first);
      const photos = await f.db
        .select()
        .from(s.evidenceFiles)
        .where(eq(s.evidenceFiles.vehicleId, f.vehicleId));
      expect(photos).toHaveLength(1);
      expect(photos[0].content).toBe(png);
      expect(photos[0].mimeType).toBe("image/png");
      expect(
        await f.db
          .select()
          .from(s.occurrences)
          .where(eq(s.occurrences.vehicleId, f.vehicleId))
      ).toHaveLength(1);
      const [v] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(v.status).toBe("manutencao");
      expect(v.currentKm).toBe(101);
      await expect(
        caller(f.other).checklists.getById({ id: first.id })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(
        await caller(f.other).checklists.list({ vehicleId: f.vehicleId })
      ).toHaveLength(0);
    });
    it("rolls back the whole checklist when a later photo is invalid", async () => {
      const f = await fixture();
      const extra = await f.db.insert(s.checklistTemplateItems).values({
        templateId: f.templateId,
        description: "Pneus",
        isCritical: true,
      });
      await expect(
        f.driver.checklists.submit({
          vehicleId: f.vehicleId,
          templateId: f.templateId,
          km: 105,
          ...meta(),
          responses: [
            { templateItemId: f.itemId, response: "nao_ok", photoData: png },
            {
              templateItemId: extra[0].insertId,
              response: "nao_ok",
              photoData: "invalida",
            },
          ],
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await f.db
          .select()
          .from(s.checklists)
          .where(eq(s.checklists.vehicleId, f.vehicleId))
      ).toHaveLength(0);
      expect(
        await f.db
          .select()
          .from(s.evidenceFiles)
          .where(eq(s.evidenceFiles.vehicleId, f.vehicleId))
      ).toHaveLength(0);
    });
    it("rejects regressive readings and serializes concurrent readings", async () => {
      const f = await fixture();
      await expect(
        f.driver.checklists.submit({
          vehicleId: f.vehicleId,
          ...f.inspection,
          km: 99,
          ...meta(),
        })
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await Promise.allSettled(
        [110, 120].map(km =>
          f.driver.checklists.submit({
            vehicleId: f.vehicleId,
            ...f.inspection,
            km,
            ...meta(),
          })
        )
      );
      const [v] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(v.currentKm).toBe(120);
      await f.manager.vehicles.adjustKm({
        id: f.vehicleId,
        newKm: 115,
        reason: "Conferência física com foto",
      });
      const readings = await f.db
        .select()
        .from(s.odometerReadings)
        .where(eq(s.odometerReadings.vehicleId, f.vehicleId));
      expect(
        readings.some(
          r => r.previousKm === 120 && r.correctedKm === 115 && r.reason
        )
      ).toBe(true);
    });
    it("permits a single concurrent pickup and keeps a critical return unavailable", async () => {
      const f = await fixture();
      const command = {
        vehicleId: f.vehicleId,
        projectId: f.projectId,
        endDate: new Date(Date.now() + 3600000),
        km: 100,
        fuel: 80,
        inspection: f.inspection,
        ...meta(),
      };
      const results = await Promise.allSettled([
        f.driver.reservations.pickup(command),
        caller(f.other).reservations.pickup({ ...command, ...meta() }),
      ]);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      const rows = await f.db
        .select()
        .from(s.reservations)
        .where(
          and(
            eq(s.reservations.vehicleId, f.vehicleId),
            eq(s.reservations.status, "em_uso")
          )
        );
      expect(rows).toHaveLength(1);
      const row = rows[0];
      const user = row.userId === f.other.id ? f.other : f.people.motorista;
      const returned = await caller(user).reservations.return({
        id: row.id,
        km: 125,
        fuel: 60,
        collectedAt: new Date(),
        inspection: {
          templateId: f.templateId,
          responses: [
            { templateItemId: f.itemId, response: "nao_ok", photoData: png },
          ],
        },
        ...meta(),
      });
      expect(returned.distanceKm).toBe(25);
      expect(returned.available).toBe(false);
      expect(returned.reasons).toContain("ocorrencia_critica");
    });
    it("checks interval conflicts and permits adjacent reservations", async () => {
      const f = await fixture();
      const start = new Date(Date.now() + 3600000),
        end = new Date(start.getTime() + 3600000);
      const command = {
        vehicleId: f.vehicleId,
        userId: f.people.motorista.id,
        projectId: f.projectId,
        startDate: start,
        endDate: end,
        ...meta(),
      };
      const results = await Promise.allSettled([
        f.manager.reservations.create(command),
        f.manager.reservations.create({ ...command, ...meta() }),
      ]);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (
          await f.driver.vehicles.listAvailable({
            startDate: start,
            endDate: end,
          })
        ).some(v => v.id === f.vehicleId)
      ).toBe(false);
      await expect(
        f.manager.reservations.create({
          ...command,
          startDate: end,
          endDate: new Date(end.getTime() + 3600000),
          ...meta(),
        })
      ).resolves.toMatchObject({ status: "agendada" });
    });
    it("does not release a vehicle when completing an OS with another critical occurrence", async () => {
      const f = await fixture();
      await f.db.insert(s.occurrences).values({
        vehicleId: f.vehicleId,
        reportedById: f.people.motorista.id,
        description: "Outra restrição de segurança",
        severity: "alta",
        occurredAt: new Date(),
      });
      const so = await f.manager.serviceOrders.create({
        vehicleId: f.vehicleId,
        description: "Reparo de outro componente",
        maintenanceType: "corretiva",
        assignedToId: f.people.manutencao.id,
      });
      await f.maintenance.serviceOrders.start({ id: so.id });
      await f.maintenance.serviceOrders.complete({
        id: so.id,
        executionNotes: "Serviço executado e conferido",
        releaseVehicle: true,
      });
      const [vehicle] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(vehicle.status).toBe("manutencao");
    });
    it("enforces assigned OS access and budget totals and allows approved OS execution", async () => {
      const f = await fixture();
      const so = await f.manager.serviceOrders.create({
        vehicleId: f.vehicleId,
        description: "Revisão",
        maintenanceType: "preventiva",
      });
      await expect(
        f.maintenance.serviceOrders.getById({ id: so.id })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        f.manager.serviceOrders.addItem({
          serviceOrderId: so.id,
          itemType: "peca",
          description: "Peça",
          quantity: "2",
          unitPrice: "10.00",
          totalPrice: "1.00",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await f.manager.serviceOrders.addItem({
        serviceOrderId: so.id,
        itemType: "peca",
        description: "Peça",
        quantity: "2",
        unitPrice: "10.00",
      });
      await f.manager.serviceOrders.submitForApproval({ id: so.id });
      await f.manager.serviceOrders.approve({ id: so.id });
      await f.manager.serviceOrders.start({ id: so.id });
      const detail = await f.manager.serviceOrders.getById({ id: so.id });
      expect(detail?.status).toBe("em_andamento");
      expect(detail?.items[0].totalPrice).toBe("20.00");
    });
    it("rejects reuse of an idempotency key with different content", async () => {
      const f = await fixture();
      const command = {
        vehicleId: f.vehicleId,
        collectedAt: new Date(),
        description: "Problema no motor",
        severity: "media" as const,
        ...meta(),
      };
      const first = await f.driver.reservations.reportProblem(command);
      const duplicate = await f.driver.reservations.reportProblem(command);
      expect(duplicate).toEqual(first);
      await expect(
        f.driver.reservations.reportProblem({
          ...command,
          description: "Outra descrição",
        })
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(
        await f.db
          .select()
          .from(s.occurrences)
          .where(eq(s.occurrences.vehicleId, f.vehicleId))
      ).toHaveLength(1);
    });
    it("rolls back earlier database writes when a later response insert fails", async () => {
      const f = await fixture();
      const extra = await f.db.insert(s.checklistTemplateItems).values({
        templateId: f.templateId,
        description: "Pneus",
        isCritical: true,
      });
      const trigger = `test_failure_${f.vehicleId}`;
      const { sql } = await import("drizzle-orm");
      await f.db.execute(
        sql.raw(
          `CREATE TRIGGER ${trigger} BEFORE INSERT ON checklistResponses FOR EACH ROW BEGIN IF NEW.templateItemId = ${extra[0].insertId} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated injected failure'; END IF; END`
        )
      );
      try {
        await expect(
          f.driver.checklists.submit({
            vehicleId: f.vehicleId,
            templateId: f.templateId,
            km: 130,
            ...meta(),
            responses: [
              { templateItemId: f.itemId, response: "nao_ok", photoData: png },
              {
                templateItemId: extra[0].insertId,
                response: "nao_ok",
                photoData: png,
              },
            ],
          })
        ).rejects.toBeDefined();
        expect(
          await f.db
            .select()
            .from(s.checklists)
            .where(eq(s.checklists.vehicleId, f.vehicleId))
        ).toHaveLength(0);
        expect(
          await f.db
            .select()
            .from(s.evidenceFiles)
            .where(eq(s.evidenceFiles.vehicleId, f.vehicleId))
        ).toHaveLength(0);
        expect(
          await f.db
            .select()
            .from(s.occurrences)
            .where(eq(s.occurrences.vehicleId, f.vehicleId))
        ).toHaveLength(0);
        const [v] = await f.db
          .select()
          .from(s.vehicles)
          .where(eq(s.vehicles.id, f.vehicleId));
        expect(v.currentKm).toBe(100);
        expect(v.status).toBe("ativo");
      } finally {
        await f.db.execute(sql.raw(`DROP TRIGGER ${trigger}`));
      }
    });
    it("rejects stale aggregate revisions instead of overwriting concurrent changes", async () => {
      const f = await fixture();
      const change = {
        id: f.vehicleId,
        model: "Revisado",
        expectedRevision: 0,
        ...meta(),
      };
      const results = await Promise.allSettled([
        f.manager.vehicles.update(change),
        caller(f.people.admin).vehicles.update({
          ...change,
          model: "Outro valor",
          ...meta(),
        }),
      ]);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      const failed = results.find(
        r => r.status === "rejected"
      ) as PromiseRejectedResult;
      expect(failed.reason.code).toBe("CONFLICT");
    });
    it("exports filtered authorized rows and rejects driver and maintenance exports", async () => {
      const f = await fixture();
      await expect(
        f.driver.reports.csv({ entity: "vehicles", filters: {} })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(f.maintenance.reports.authorize()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      const [vehicle] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      const report = await f.manager.reports.csv({
        entity: "vehicles",
        filters: { search: vehicle.plate, status: "ativo" },
      });
      expect(report.rowCount).toBe(1);
      expect(report.content).toContain(vehicle.plate);
      expect(report.filters.search).toBe(vehicle.plate);
    });
    it("preserves manual restrictions and permission-limited occurrence closure", async () => {
      const f = await fixture();
      await f.manager.vehicles.update({
        id: f.vehicleId,
        status: "manutencao",
        statusReason: "Bloqueio manual para inspeção de segurança",
      });
      const occurrence = await f.driver.reservations.reportProblem({
        vehicleId: f.vehicleId,
        description: "Problema crítico",
        severity: "alta",
        collectedAt: new Date(),
        ...meta(),
      });
      const so = await f.manager.serviceOrders.create({
        vehicleId: f.vehicleId,
        description: "Reparo",
        maintenanceType: "corretiva",
        occurrenceId: occurrence.id,
        assignedToId: f.people.manutencao.id,
      });
      await f.maintenance.serviceOrders.start({ id: so.id });
      await f.maintenance.serviceOrders.complete({
        id: so.id,
        executionNotes: "Reparo executado",
        releaseVehicle: true,
      });
      const [issue] = await f.db
        .select()
        .from(s.occurrences)
        .where(eq(s.occurrences.id, occurrence.id));
      expect(issue.status).not.toBe("encerrado");
      await f.manager.occurrences.close({
        id: issue.id,
        closureNotes: "Conferência humana concluída",
      });
      const [v] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(v.status).toBe("manutencao");
      await f.manager.vehicles.update({
        id: f.vehicleId,
        status: "ativo",
        statusReason: "Inspeção concluída e bloqueio manual liberado",
      });
      const [released] = await f.db
        .select()
        .from(s.vehicles)
        .where(eq(s.vehicles.id, f.vehicleId));
      expect(released.status).toBe("ativo");
    });
    it("recovers receipts and repeats events until an explicit consumer acknowledgement", async () => {
      const f = await fixture();
      const command = {
        vehicleId: f.vehicleId,
        description: "Problema no painel",
        severity: "media" as const,
        collectedAt: new Date(),
        ...meta(),
      };
      await f.driver.reservations.reportProblem(command);
      expect(
        (
          await f.driver.integration.operationStatus({
            operation: "reservations.reportProblem",
            idempotencyKey: command.idempotencyKey,
          })
        ).status
      ).toBe("confirmed");
      expect(
        (
          await caller(f.other).integration.operationStatus({
            operation: "reservations.reportProblem",
            idempotencyKey: command.idempotencyKey,
          })
        ).status
      ).toBe("not_confirmed");
      const events = await f.manager.integration.events({
        consumer: "test",
        limit: 100,
      });
      expect(events.length).toBeGreaterThan(0);
      const event = events[0];
      const repeated = await f.manager.integration.events({
        consumer: "test",
        limit: 100,
      });
      expect(repeated.some(e => e.id === event.id)).toBe(true);
      await f.manager.integration.acknowledgeEvent({
        consumer: "test",
        eventId: event.id,
      });
      expect(
        (
          await f.manager.integration.events({ consumer: "test", limit: 100 })
        ).some(e => e.id === event.id)
      ).toBe(false);
    });
  }
);
it.skipIf(!enabled)("does not let maintenance cancel another person's reservation", async () => {
  const f = await fixture();
  const booking = await f.manager.reservations.create({
    vehicleId: f.vehicleId,
    userId: f.people.motorista.id,
    projectId: f.projectId,
    startDate: new Date(Date.now() + 60000),
    endDate: new Date(Date.now() + 3600000),
    ...meta(),
  });
  await expect(
    f.maintenance.reservations.cancel({
      id: booking.id,
      reason: "Tentativa sem vínculo",
      ...meta(),
    })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    f.driver.reservations.cancel({
      id: booking.id,
      reason: "Viagem desmarcada",
      ...meta(),
    })
  ).resolves.toMatchObject({ status: "cancelada" });
});
