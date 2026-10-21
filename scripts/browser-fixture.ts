import { SignJWT } from "jose";
import fs from "node:fs/promises";
import { fixture, isolatedDatabase } from "../server/domain/__tests__/fixtures";
if (!isolatedDatabase()) throw new Error("Use isolated test database");
const f = await fixture();
const sign = async (openId: string, name: string | null) =>
  new SignJWT({ openId, appId: "isolated-test", name: name || "Teste" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const cookie = await sign(f.people.motorista.openId, f.people.motorista.name);
const otherCookie = await sign(f.other.openId, f.other.name);
const adminCookie = await sign(f.people.admin.openId, f.people.admin.name);
await fs.writeFile(
  "/workspace/browser-fixture.json",
  JSON.stringify({
    cookie,
    otherCookie,
    adminCookie,
    userId: f.people.motorista.id,
    vehicleId: f.vehicleId,
    templateId: f.templateId,
    projectId: f.projectId,
    plate: (
      await f.db.select().from((await import("../drizzle/schema")).vehicles)
    ).find(v => v.id === f.vehicleId)?.plate,
  }),
  { mode: 0o600 }
);
process.exit(0);
