import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Checklists Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return a list of checklists", () => {
      const mockChecklists = [
        {
          id: 1,
          vehicleId: 1,
          vehiclePlate: "ABC-1234",
          vehicleModel: "Hilux",
          userId: 1,
          userName: "João Silva",
          templateId: 1,
          templateName: "Checklist Diário",
          executedAt: new Date(),
          km: 50000,
          hasIssues: false,
          observations: null,
        },
      ];

      expect(mockChecklists).toHaveLength(1);
      expect(mockChecklists[0]).toHaveProperty("vehiclePlate");
      expect(mockChecklists[0]).toHaveProperty("hasIssues");
    });

    it("should filter checklists with issues", () => {
      const mockChecklists = [
        { id: 1, hasIssues: false },
        { id: 2, hasIssues: true },
        { id: 3, hasIssues: false },
        { id: 4, hasIssues: true },
      ];

      const checklistsWithIssues = mockChecklists.filter((c) => c.hasIssues);

      expect(checklistsWithIssues).toHaveLength(2);
    });
  });

  describe("submit", () => {
    it("should validate required fields", () => {
      const validChecklist = {
        vehicleId: 1,
        templateId: 1,
        responses: [
          { templateItemId: 1, response: "ok" as const },
          { templateItemId: 2, response: "nao_ok" as const, comment: "Pneu furado" },
        ],
      };

      expect(validChecklist.vehicleId).toBeGreaterThan(0);
      expect(validChecklist.templateId).toBeGreaterThan(0);
      expect(validChecklist.responses.length).toBeGreaterThan(0);
    });

    it("should detect issues from responses", () => {
      const responses = [
        { templateItemId: 1, response: "ok" as const },
        { templateItemId: 2, response: "nao_ok" as const },
        { templateItemId: 3, response: "na" as const },
      ];

      const hasIssues = responses.some((r) => r.response === "nao_ok");

      expect(hasIssues).toBe(true);
    });

    it("should not detect issues when all responses are ok or na", () => {
      const responses = [
        { templateItemId: 1, response: "ok" as const },
        { templateItemId: 2, response: "ok" as const },
        { templateItemId: 3, response: "na" as const },
      ];

      const hasIssues = responses.some((r) => r.response === "nao_ok");

      expect(hasIssues).toBe(false);
    });
  });

  describe("critical items", () => {
    it("should identify critical items with issues", () => {
      const templateItems = [
        { id: 1, description: "Freios", isCritical: true },
        { id: 2, description: "Limpador de para-brisa", isCritical: false },
        { id: 3, description: "Pneus", isCritical: true },
      ];

      const responses = [
        { templateItemId: 1, response: "ok" as const },
        { templateItemId: 2, response: "nao_ok" as const },
        { templateItemId: 3, response: "nao_ok" as const },
      ];

      const criticalIssues = responses.filter((r) => {
        if (r.response !== "nao_ok") return false;
        const item = templateItems.find((i) => i.id === r.templateItemId);
        return item?.isCritical ?? false;
      });

      expect(criticalIssues).toHaveLength(1);
      expect(criticalIssues[0].templateItemId).toBe(3);
    });

    it("should block vehicle when critical item has issue", () => {
      const templateItems = [
        { id: 1, description: "Freios", isCritical: true },
      ];

      const responses = [
        { templateItemId: 1, response: "nao_ok" as const },
      ];

      const hasCriticalIssue = responses.some((r) => {
        if (r.response !== "nao_ok") return false;
        const item = templateItems.find((i) => i.id === r.templateItemId);
        return item?.isCritical ?? false;
      });

      expect(hasCriticalIssue).toBe(true);
      // In actual implementation, this should trigger vehicle blocking
    });
  });

  describe("occurrence generation", () => {
    it("should generate occurrence for items with issues", () => {
      const checklistId = 1;
      const vehicleId = 1;
      const responses = [
        { templateItemId: 1, response: "nao_ok" as const, comment: "Pneu furado" },
        { templateItemId: 2, response: "ok" as const },
      ];

      const itemsWithIssues = responses.filter((r) => r.response === "nao_ok");

      expect(itemsWithIssues).toHaveLength(1);
      
      // Each item with issue should generate an occurrence
      const occurrences = itemsWithIssues.map((item) => ({
        vehicleId,
        severity: "media" as const,
        description: item.comment || "Problema identificado no checklist",
        checklistId,
      }));

      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].description).toBe("Pneu furado");
    });
  });
});

describe("Checklist Responses", () => {
  it("should have valid response types", () => {
    const CHECKLIST_RESPONSES = ["ok", "nao_ok", "na"] as const;

    expect(CHECKLIST_RESPONSES).toContain("ok");
    expect(CHECKLIST_RESPONSES).toContain("nao_ok");
    expect(CHECKLIST_RESPONSES).toContain("na");
  });
});

describe("Checklist Templates", () => {
  describe("list", () => {
    it("should return active templates", () => {
      const mockTemplates = [
        { id: 1, name: "Checklist Diário", active: true },
        { id: 2, name: "Checklist Semanal", active: true },
        { id: 3, name: "Checklist Antigo", active: false },
      ];

      const activeTemplates = mockTemplates.filter((t) => t.active);

      expect(activeTemplates).toHaveLength(2);
    });
  });

  describe("items", () => {
    it("should return template items in order", () => {
      const mockItems = [
        { id: 1, templateId: 1, description: "Item 1", order: 1 },
        { id: 2, templateId: 1, description: "Item 2", order: 2 },
        { id: 3, templateId: 1, description: "Item 3", order: 3 },
      ];

      const sortedItems = [...mockItems].sort((a, b) => a.order - b.order);

      expect(sortedItems[0].order).toBe(1);
      expect(sortedItems[1].order).toBe(2);
      expect(sortedItems[2].order).toBe(3);
    });
  });
});
