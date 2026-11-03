import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response, NextFunction } from "express";
import { and, desc, eq, gt, like } from "drizzle-orm";
import { getDb } from "../db";
import {
  vehicles,
  serviceOrders,
  serviceOrderItems,
  auditLogs,
  users,
  type User,
} from "../../drizzle/schema";
import { ENV } from "./env";
import { createAuditLog, getRequestInfo } from "../audit";
import { dispatchAtenaWebhook } from "./atenaWebhook";

/**
 * API de integração externa — consumida pela Atena OS.
 *
 * Diferente do tRPC (que o front usa com cookie de sessão de navegador), esta
 * camada é serviço-a-serviço: a Atena envia um TOKEN de serviço no header
 * `Authorization: Bearer <ATENA_API_TOKEN>`. Aplica os princípios do guia da
 * Atena adaptados a esta stack (Express + Drizzle + MySQL, app de um só tenant):
 *   R1  autentica na primeira linha de toda rota (requireAtenaToken);
 *   R4  o token vive só no servidor (env) e nunca é devolvido ao cliente;
 *   R6  escrita sensível (abrir OS) entra como `pendente_aprovacao`, não executa direto;
 *   R7  toda escrita grava auditoria com atribuição;
 *   R8  falha fechado, com status certo e mensagem amigável; detalhe vai pro log.
 * Observação sobre R2 (isolar por conta): o arqueofrotas é de um único tenant
 * (a frota da empresa), então não há multi-conta a isolar aqui — o token dá
 * acesso à frota inteira. Por isso ele é um segredo forte e só vive na Atena.
 */

const unauthorized = (res: Response) =>
  res.status(401).json({ error: "Autenticação necessária." });

/** Compara em tempo constante para não vazar o token por timing. */
function tokenMatches(provided: string): boolean {
  const expected = ENV.atenaApiToken;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** R1: identidade antes de qualquer lógica. */
function requireAtenaToken(req: Request, res: Response, next: NextFunction) {
  // Token não configurado no servidor: a API fica fechada (falha fechado).
  if (!ENV.atenaApiToken) {
    console.error("[AtenaAPI] ATENA_API_TOKEN não configurado; rota bloqueada.");
    return unauthorized(res);
  }
  const header = req.header("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!tokenMatches(bearer)) return unauthorized(res);
  next();
}

/** Resolve o "ator" de uma escrita (atribuição, R7). */
async function resolveActor(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  actorEmail?: string
): Promise<User | null> {
  if (actorEmail) {
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, actorEmail.trim().toLowerCase()))
      .limit(1);
    if (u && u.active) return u;
  }
  // Sem ator informado (ou inválido): usa o admin mais antigo como conta de
  // serviço da integração, para a ação nunca ficar órfã na auditoria.
  const [admin] = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)))
    .orderBy(users.id)
    .limit(1);
  return admin ?? null;
}

// Campos públicos de veículo (não expõe nada sensível; são dados da própria frota).
const vehicleView = {
  id: vehicles.id,
  plate: vehicles.plate,
  model: vehicles.model,
  brand: vehicles.brand,
  year: vehicles.year,
  color: vehicles.color,
  vehicleType: vehicles.vehicleType,
  status: vehicles.status,
  currentKm: vehicles.currentKm,
  chassi: vehicles.chassi,
  renavam: vehicles.renavam,
  unitId: vehicles.unitId,
  observations: vehicles.observations,
  active: vehicles.active,
  createdAt: vehicles.createdAt,
  updatedAt: vehicles.updatedAt,
};

export function registerAtenaApiRoutes(app: Express) {
  // Todas as rotas abaixo exigem o token da Atena.
  app.use("/api/atena", requireAtenaToken);

  // Saúde da integração (R8: sinal vital simples).
  app.get("/api/atena/health", async (_req, res) => {
    const db = await getDb();
    res.json({ ok: true, db: Boolean(db), service: "arqueofrotas" });
  });

  // ---------- VEÍCULOS ----------

  // GET /api/atena/vehicles?status=&plate=&limit=&offset=
  app.get("/api/atena/vehicles", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const status = req.query.status as string | undefined;
      const plate = req.query.plate as string | undefined;
      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const conditions = [];
      if (status === "ativo" || status === "manutencao" || status === "baixado")
        conditions.push(eq(vehicles.status, status));
      if (plate) conditions.push(like(vehicles.plate, `%${plate.toUpperCase()}%`));

      const data = await db
        .select(vehicleView)
        .from(vehicles)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(vehicles.plate)
        .limit(limit)
        .offset(offset);

      res.json({ data, limit, offset });
    } catch (error) {
      console.error("[AtenaAPI] GET /vehicles", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });

  // GET /api/atena/vehicles/:id
  app.get("/api/atena/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const [vehicle] = await db
        .select(vehicleView)
        .from(vehicles)
        .where(eq(vehicles.id, id))
        .limit(1);
      if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado." });
      res.json({ data: vehicle });
    } catch (error) {
      console.error("[AtenaAPI] GET /vehicles/:id", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });

  // PATCH /api/atena/vehicles/:id  { currentKm?, status?, observations?, actorEmail? }
  app.patch("/api/atena/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const body = req.body ?? {};
      const update: Record<string, unknown> = {};

      if (body.currentKm !== undefined) {
        const km = Number(body.currentKm);
        if (!Number.isInteger(km) || km < 0)
          return res.status(400).json({ error: "currentKm inválido." });
        update.currentKm = km;
      }
      if (body.status !== undefined) {
        if (!["ativo", "manutencao", "baixado"].includes(body.status))
          return res.status(400).json({ error: "status inválido." });
        update.status = body.status;
      }
      if (body.observations !== undefined) {
        if (typeof body.observations !== "string" || body.observations.length > 5000)
          return res.status(400).json({ error: "observations inválido." });
        update.observations = body.observations;
      }
      if (Object.keys(update).length === 0)
        return res.status(400).json({ error: "Nada para atualizar." });

      const [before] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, id))
        .limit(1);
      if (!before) return res.status(404).json({ error: "Veículo não encontrado." });

      await db.update(vehicles).set(update).where(eq(vehicles.id, id));
      const actor = await resolveActor(db, body.actorEmail);

      await createAuditLog({
        user: actor,
        action: "UPDATE",
        entityType: "vehicle",
        entityId: id,
        previousData: { currentKm: before.currentKm, status: before.status },
        newData: { ...update, via: "atena-api" },
        ...getRequestInfo(req),
      });

      await dispatchAtenaWebhook({
        type: "vehicle.updated",
        occurredAt: new Date().toISOString(),
        data: { vehicleId: id, plate: before.plate, changes: update },
      });

      res.json({ ok: true, id });
    } catch (error) {
      console.error("[AtenaAPI] PATCH /vehicles/:id", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });

  // ---------- ORDENS DE SERVIÇO (MANUTENÇÃO) ----------

  // GET /api/atena/service-orders?vehicleId=&status=&limit=&offset=
  app.get("/api/atena/service-orders", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : undefined;
      const status = req.query.status as string | undefined;
      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const conditions = [eq(serviceOrders.isDeleted, false)];
      if (vehicleId && Number.isInteger(vehicleId))
        conditions.push(eq(serviceOrders.vehicleId, vehicleId));
      if (status) conditions.push(eq(serviceOrders.status, status as never));

      const data = await db
        .select()
        .from(serviceOrders)
        .where(and(...conditions))
        .orderBy(desc(serviceOrders.id))
        .limit(limit)
        .offset(offset);

      res.json({ data, limit, offset });
    } catch (error) {
      console.error("[AtenaAPI] GET /service-orders", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });

  // GET /api/atena/service-orders/:id  (com itens)
  app.get("/api/atena/service-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const [order] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.id, id))
        .limit(1);
      if (!order || order.isDeleted)
        return res.status(404).json({ error: "OS não encontrada." });

      const items = await db
        .select()
        .from(serviceOrderItems)
        .where(eq(serviceOrderItems.serviceOrderId, id));

      res.json({ data: { ...order, items } });
    } catch (error) {
      console.error("[AtenaAPI] GET /service-orders/:id", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });

  // POST /api/atena/service-orders
  // { vehicleId, maintenanceType, description, priority?, supplierName?, actorEmail? }
  // R6: entra como `pendente_aprovacao` — não abre a OS direto; o dono aprova no app.
  app.post("/api/atena/service-orders", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const body = req.body ?? {};
      const vehicleId = Number(body.vehicleId);
      const maintenanceType = body.maintenanceType;
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const priority = body.priority ?? "media";

      if (!Number.isInteger(vehicleId))
        return res.status(400).json({ error: "vehicleId inválido." });
      if (!["preventiva", "corretiva"].includes(maintenanceType))
        return res.status(400).json({ error: "maintenanceType inválido (preventiva|corretiva)." });
      if (!description || description.length > 5000)
        return res.status(400).json({ error: "description inválido." });
      if (!["baixa", "media", "alta"].includes(priority))
        return res.status(400).json({ error: "priority inválido (baixa|media|alta)." });

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId))
        .limit(1);
      if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado." });

      const actor = await resolveActor(db, body.actorEmail);
      if (!actor)
        return res.status(503).json({ error: "Nenhum usuário admin para atribuir a OS." });

      const osCode = `OS-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
      const result = await db.insert(serviceOrders).values({
        osCode,
        vehicleId,
        maintenanceType,
        description,
        priority,
        status: "pendente_aprovacao",
        openedById: actor.id,
        kmAtOpen: vehicle.currentKm,
        supplierName:
          typeof body.supplierName === "string" ? body.supplierName.slice(0, 255) : null,
      });
      const insertId = result[0].insertId;

      await createAuditLog({
        user: actor,
        action: "SERVICE_ORDER_OPEN",
        entityType: "service_order",
        entityId: insertId,
        newData: { osCode, vehicleId, maintenanceType, priority, via: "atena-api" },
        ...getRequestInfo(req),
      });

      await dispatchAtenaWebhook({
        type: "service_order.created",
        occurredAt: new Date().toISOString(),
        data: {
          serviceOrderId: insertId,
          osCode,
          vehicleId,
          plate: vehicle.plate,
          status: "pendente_aprovacao",
        },
      });

      res.status(201).json({ id: insertId, osCode, status: "pendente_aprovacao" });
    } catch (error) {
      console.error("[AtenaAPI] POST /service-orders", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });

  // ---------- FEED DE EVENTOS (pull, alternativa ao webhook) ----------

  // GET /api/atena/events?since=<auditLogId>&limit=
  // A Atena guarda o maior id recebido e pede os seguintes. Lê a trilha de
  // auditoria (fonte de verdade das mudanças), sem precisar de nova tabela.
  app.get("/api/atena/events", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Indisponível." });

      const since = Math.max(Number(req.query.since) || 0, 0);
      const limit = Math.min(Number(req.query.limit) || 100, 200);

      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          newData: auditLogs.newData,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(gt(auditLogs.id, since))
        .orderBy(auditLogs.id)
        .limit(limit);

      const cursor = rows.length ? rows[rows.length - 1].id : since;
      res.json({ data: rows, cursor });
    } catch (error) {
      console.error("[AtenaAPI] GET /events", error);
      res.status(503).json({ error: "Indisponível." });
    }
  });
}
