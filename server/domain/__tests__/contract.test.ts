import { describe, it, expect } from "vitest";
import {
  invokeDelegated,
  type DelegatedRequest,
} from "../../../shared/integration-contract";
const request = (): DelegatedRequest => ({
  version: "1.0.0",
  requestId: crypto.randomUUID(),
  idempotencyKey: crypto.randomUUID(),
  originator: {
    userId: 7,
    groupId: "grupo-arqueo",
    companyId: null,
    unitId: null,
  },
  delegation: {
    service: "atena-os",
    grantId: "grant-7",
    scopes: ["reservations.pickup"],
  },
  operation: "reservations.pickup",
  vehicleId: 4,
  expectedRevision: 2,
  parameters: {},
});
describe("Atena adapter contract with simulated executor", () => {
  it("preserves originator, stable identifiers and revision when invoking the domain", async () => {
    const input = request();
    const verified = {
      userId: 7,
      service: "atena-os" as const,
      grantId: "grant-7",
      scopes: ["reservations.pickup"],
    };
    let calls = 0;
    const result = await invokeDelegated(input, verified, async req => {
      calls++;
      expect(req.originator.userId).toBe(7);
      expect(req.expectedRevision).toBe(2);
      return { id: 5 };
    });
    expect(calls).toBe(1);
    expect(result.requestId).toBe(input.requestId);
  });
  it("rejects impersonation, excess scopes and missing concurrency controls before invoking", async () => {
    const input = request();
    let calls = 0;
    const run = async () => {
      calls++;
    };
    const verified = {
      userId: 8,
      service: "atena-os" as const,
      grantId: "grant-7",
      scopes: ["reservations.pickup"],
    };
    await expect(invokeDelegated(input, verified, run)).rejects.toThrow(
      "DELEGATION_FORBIDDEN"
    );
    await expect(
      invokeDelegated(
        { ...input, expectedRevision: undefined },
        { ...verified, userId: 7 },
        run
      )
    ).rejects.toThrow("REVISION_REQUIRED");
    await expect(
      invokeDelegated(input, { ...verified, userId: 7, scopes: [] }, run)
    ).rejects.toThrow("DELEGATION_FORBIDDEN");
    expect(calls).toBe(0);
  });
});
