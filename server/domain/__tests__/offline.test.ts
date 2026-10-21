import { beforeEach, describe, it, expect } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import {
  saveCommand,
  listCommands,
  readLocal,
  saveLocal,
  forgetConfirmed,
  type Command,
} from "../../../client/src/offline/store";
import { synchronize } from "../../../client/src/offline/sync";
beforeEach(() => {
  Object.defineProperty(globalThis, "indexedDB", {
    value: new IDBFactory(),
    configurable: true,
  });
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
});
const command = (): Command => ({
  id: crypto.randomUUID(),
  userId: 7,
  kind: "return",
  state: "pending",
  collectedAt: new Date().toISOString(),
  payload: { km: 120, photoData: "foto-original" },
});
describe("Encrypted durable offline queue", () => {
  it("recovers drafts and photos after reopening IndexedDB and separates users", async () => {
    const c = { ...command(), state: "draft" as const };
    await saveCommand(c);
    expect(await listCommands(7)).toEqual([c]);
    expect(await listCommands(8)).toEqual([]);
    expect(await readLocal(8, `command:${c.id}`)).toBeUndefined();
  });
  it("never removes evidence before server confirmation", async () => {
    const c = command();
    await saveCommand(c);
    await expect(forgetConfirmed(7, c.id)).rejects.toThrow();
    expect((await listCommands(7))[0].payload.photoData).toBe("foto-original");
  });
  it("keeps a session-expired return pending and retries with the same stable key", async () => {
    const c = command();
    await saveCommand(c);
    const expired = await synchronize(c, 7, async () => {
      throw Object.assign(new Error("expired"), {
        data: { code: "UNAUTHORIZED" },
      });
    });
    expect(expired.state).toBe("pending");
    expect(expired.error).toContain("Sessão expirada");
    let effects = 0;
    const received = new Map();
    const send = async (_: unknown, payload: Record<string, unknown>) => {
      if (!received.has(payload.idempotencyKey)) {
        effects++;
        received.set(payload.idempotencyKey, { id: 9 });
      }
      return received.get(payload.idempotencyKey);
    };
    await synchronize(expired, 7, send);
    await synchronize(expired, 7, send);
    expect(effects).toBe(1);
    expect((await listCommands(7))[0].state).toBe("confirmed");
    await forgetConfirmed(7, c.id);
    expect(await listCommands(7)).toHaveLength(0);
  });
  it("preserves a lost-response retry without duplicating the simulated server effect", async () => {
    const c = command();
    await saveCommand(c);
    let first = true,
      effects = 0;
    const ids = new Set();
    const send = async (_: unknown, payload: Record<string, unknown>) => {
      if (!ids.has(payload.idempotencyKey)) {
        effects++;
        ids.add(payload.idempotencyKey);
      }
      if (first) {
        first = false;
        throw new Error("response lost");
      }
      return { status: "concluida" };
    };
    const pending = await synchronize(c, 7, send);
    expect(pending.state).toBe("pending");
    const final = await synchronize(pending, 7, send);
    expect(final.state).toBe("confirmed");
    expect(effects).toBe(1);
  });
  it("makes conflicts explicit and never auto-confirms a draft pickup", async () => {
    const c = command();
    await saveCommand(c);
    const conflict = await synchronize(c, 7, async () => {
      throw Object.assign(new Error("Leitura inferior"), {
        data: { code: "CONFLICT" },
      });
    });
    expect(conflict.state).toBe("conflict");
    expect(conflict.payload.photoData).toBe("foto-original");
    let calls = 0;
    const draft = { ...c, kind: "pickup" as const, state: "draft" as const };
    await synchronize(draft, 7, async () => {
      calls++;
    });
    expect(calls).toBe(0);
    await expect(synchronize(c, 8, async () => {})).rejects.toThrow("usuário");
  });
  it("preserves Date values in encrypted cached context", async () => {
    const date = new Date();
    await saveLocal(7, "context", { date });
    expect(await readLocal(7, "context")).toEqual({ date });
  });
});
