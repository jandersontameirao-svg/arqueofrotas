import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import * as s from "../../../drizzle/schema";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";
export const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
export function caller(user: s.User) {
  return appRouter.createCaller({
    user,
    req: { headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie() {} } as unknown as TrpcContext["res"],
  });
}
export const meta = () => {
  const id = randomUUID();
  return { requestId: id, idempotencyKey: id };
};
export async function fixture() {
  if (!isolatedDatabase())
    throw new Error(
      "Database fixtures require FLEET_TEST_DATABASE_URL for local arqueofrotas_test"
    );
  const db = (await getDb())!;
  const tag = randomUUID();
  const people: Record<string, s.User> = {};
  for (const role of [
    "admin",
    "gestor_frota",
    "motorista",
    "manutencao",
  ] as const) {
    const result = await db
      .insert(s.users)
      .values({ openId: `${tag}-${role}`, name: role, role, active: true });
    [people[role]] = await db
      .select()
      .from(s.users)
      .where(eq(s.users.id, result[0].insertId));
  }
  const extra = await db
    .insert(s.users)
    .values({
      openId: tag,
      name: "Outro motorista",
      role: "motorista",
      active: true,
    });
  const [other] = await db
    .select()
    .from(s.users)
    .where(eq(s.users.id, extra[0].insertId));
  const project = await db
    .insert(s.projects)
    .values({ name: "Projeto isolado", code: tag });
  const vehicle = await db
    .insert(s.vehicles)
    .values({
      plate: tag.slice(0, 8),
      model: "Veículo de teste",
      year: 2026,
      vehicleType: "carro",
      currentKm: 100,
      defaultProjectId: project[0].insertId,
    });
  const template = await db
    .insert(s.checklistTemplates)
    .values({ name: "Inspeção de teste", vehicleType: "carro" });
  const item = await db
    .insert(s.checklistTemplateItems)
    .values({
      templateId: template[0].insertId,
      description: "Freios",
      isCritical: true,
    });
  const vehicleId = vehicle[0].insertId,
    templateId = template[0].insertId,
    itemId = item[0].insertId,
    projectId = project[0].insertId;
  const inspection = {
    templateId,
    responses: [{ templateItemId: itemId, response: "ok" as const }],
  };
  return {
    db,
    people,
    other,
    vehicleId,
    templateId,
    itemId,
    projectId,
    inspection,
    driver: caller(people.motorista),
    manager: caller(people.gestor_frota),
    maintenance: caller(people.manutencao),
  };
}
export function isolatedDatabase() {
  const url = process.env.FLEET_TEST_DATABASE_URL;
  if (!url) return false;
  const parsed = new URL(url);
  if (
    !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
    parsed.pathname !== "/arqueofrotas_test"
  )
    throw new Error(
      "Integration tests require a local arqueofrotas_test database"
    );
  process.env.DATABASE_URL = url;
  return true;
}
