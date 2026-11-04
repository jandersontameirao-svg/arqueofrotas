import { z } from "zod";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  router,
  authenticatedProcedure,
  hasPermission,
} from "../_core/trpc";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import {
  buildRealDataContext,
  getActiveMemories,
  buildMemoriesPrompt,
} from "../_core/atenaContext";
import {
  atenaChatMessages,
  atenaMemories,
  vehicles,
  serviceOrders,
  occurrences,
} from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import {
  ATENA_MEMORY_CATEGORIES,
  SEVERITY_LEVELS,
  MAINTENANCE_TYPES,
  type UserRole,
} from "@shared/const";

/** Extrai o primeiro bloco JSON de uma resposta do LLM (tolera ```json). */
function extractJson(text: string): Record<string, unknown> | null {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .filter(
        (c): c is { type: "text"; text: string } =>
          typeof c === "object" && c !== null && "type" in c && (c as { type: string }).type === "text"
      )
      .map(c => c.text)
      .join("");
  return "";
}

const SYSTEM_PROMPT = `Você é a Atena, assistente operacional do ArqueoFrotas (sistema de gestão de frotas).
Você conversa com a equipe sobre os dados REAIS da frota e ajuda a operar o sistema.

Você trabalha em três modos, no mesmo chat:
1. RESPONDER — tire dúvidas sobre como usar o sistema, processos operacionais e o que já aconteceu de fato.
   Para eventos reais (quem fez o quê, status, números), responda SOMENTE com base no "RETRATO DOS DADOS REAIS" e no "HISTÓRICO RECENTE" fornecidos abaixo. Se a informação não constar, diga que não consta — NUNCA invente.
2. APRENDER — quando o usuário ensinar uma regra, preferência, custo ou diretriz, formule uma diretriz imperativa curta e reutilizável e devolva em "memoriaSugerida" (senão, deixe "").
3. EXECUTAR (com confirmação) — se o usuário claramente pedir uma ação que o sistema faz, proponha-a em "acaoSugerida". NUNCA afirme que executou: a ação só é aplicada depois que o usuário confirmar na tela.

Ações possíveis (acaoSugerida.tipo):
- "criar_os": abrir ordem de serviço. dados: { vehicleId:number, maintenanceType:"preventiva"|"corretiva", description:string, priority?:"baixa"|"media"|"alta" }
- "registrar_ocorrencia": registrar ocorrência/avaria. dados: { vehicleId:number, description:string, severity:"baixa"|"media"|"alta", location?:string }
Use vehicleId apenas se tiver certeza do veículo (pelo contexto). Se faltar dado essencial, não proponha a ação: peça o que falta em "resposta".

Responda SEMPRE em português e SOMENTE com um JSON válido, sem markdown, exatamente neste formato:
{
  "resposta": "texto para o usuário",
  "memoriaSugerida": "diretriz a salvar ou string vazia",
  "categoria": "custo|processo|preferencia|comercial|tecnico|prazo|modelo_escopo|geral",
  "acaoSugerida": null | { "tipo": "criar_os|registrar_ocorrencia", "titulo": "...", "dados": { } }
}`;

export const atenaRouter = router({
  // Histórico do chat, por escopo (geral = vehicleId nulo).
  history: authenticatedProcedure
    .input(
      z
        .object({
          vehicleId: z.number().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const scope = input?.vehicleId ?? null;
      const rows = await db
        .select()
        .from(atenaChatMessages)
        .where(
          scope === null
            ? // chat geral
              eq(atenaChatMessages.vehicleId, 0)
            : eq(atenaChatMessages.vehicleId, scope)
        )
        .orderBy(desc(atenaChatMessages.id))
        .limit(input?.limit ?? 50);
      return rows.reverse();
    }),

  chat: authenticatedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(4000),
        vehicleId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // chat geral guarda vehicleId = 0 (coluna not-null implícita evitada usando 0 como "geral").
      const scopeId = input.vehicleId ?? 0;

      // 1. Persiste a mensagem do usuário.
      await db.insert(atenaChatMessages).values({
        role: "user",
        content: input.message,
        authorId: ctx.user.id,
        authorName: ctx.user.name,
        vehicleId: scopeId,
      });

      // 2. Monta o contexto (dados reais + memórias + estado do veículo se escopo).
      const [memories, realData, recent] = await Promise.all([
        getActiveMemories(db),
        buildRealDataContext(db),
        db
          .select()
          .from(atenaChatMessages)
          .where(eq(atenaChatMessages.vehicleId, scopeId))
          .orderBy(desc(atenaChatMessages.id))
          .limit(10),
      ]);

      let vehicleBlock = "";
      if (input.vehicleId) {
        const [v] = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, input.vehicleId))
          .limit(1);
        if (v)
          vehicleBlock = `\n\nVEÍCULO EM FOCO: ${v.plate} — ${v.brand ?? ""} ${v.model} (${v.year}), status ${v.status}, ${v.currentKm} km.`;
      }

      const memoriesPrompt = buildMemoriesPrompt(memories);
      const systemContent = [
        SYSTEM_PROMPT,
        memoriesPrompt ? `\n${memoriesPrompt}` : "",
        `\n${realData}`,
        vehicleBlock,
      ].join("");

      // Histórico recente (ordem cronológica) para continuidade.
      const historyMessages = recent
        .reverse()
        .map(m => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));

      // 3. Chama o LLM.
      let parsed: Record<string, unknown> | null = null;
      let rawText = "";
      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemContent },
            ...historyMessages,
            { role: "user", content: input.message },
          ],
          maxTokens: 1500,
        });
        rawText = messageText(result.choices[0]?.message?.content);
        parsed = extractJson(rawText);
      } catch (error) {
        console.error("[Atena] LLM falhou", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "A Atena está indisponível no momento. Tente novamente.",
        });
      }

      const resposta =
        (parsed?.resposta as string) ||
        rawText ||
        "Desculpe, não consegui formular uma resposta.";
      const memoriaSugerida = (parsed?.memoriaSugerida as string) || "";
      const categoriaRaw = (parsed?.categoria as string) || "geral";
      const categoria = (ATENA_MEMORY_CATEGORIES as readonly string[]).includes(
        categoriaRaw
      )
        ? categoriaRaw
        : "geral";
      const acaoSugerida =
        parsed?.acaoSugerida && typeof parsed.acaoSugerida === "object"
          ? parsed.acaoSugerida
          : null;

      // 4. Persiste a resposta.
      await db.insert(atenaChatMessages).values({
        role: "assistant",
        content: resposta,
        authorName: "Atena",
        vehicleId: scopeId,
        category: categoria,
      });

      return { resposta, memoriaSugerida, categoria, acaoSugerida };
    }),

  // ----- Memórias (diretrizes aprendidas) -----
  listMemories: authenticatedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(atenaMemories)
      .orderBy(desc(atenaMemories.createdAt));
  }),

  saveMemory: authenticatedProcedure
    .input(
      z.object({
        directive: z.string().min(3).max(2000),
        category: z.enum(ATENA_MEMORY_CATEGORIES).default("geral"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(atenaMemories).values({
        directive: input.directive.trim(),
        category: input.category,
        createdById: ctx.user.id,
        createdByName: ctx.user.name,
      });
      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "notification",
        entityId: result[0].insertId,
        newData: { atenaMemory: input.directive, category: input.category },
        ...getRequestInfo(ctx.req),
      });
      return { id: result[0].insertId };
    }),

  setMemoryActive: authenticatedProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(atenaMemories)
        .set({ active: input.active })
        .where(eq(atenaMemories.id, input.id));
      return { ok: true as const };
    }),

  deleteMemory: authenticatedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(atenaMemories).where(eq(atenaMemories.id, input.id));
      return { ok: true as const };
    }),

  // ----- Execução de ação sugerida (sempre após confirmação do usuário) -----
  executeAction: authenticatedProcedure
    .input(
      z.object({
        tipo: z.enum(["criar_os", "registrar_ocorrencia"]),
        dados: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const role = ctx.user.role as UserRole;
      const dados = input.dados;
      const vehicleId = Number(dados.vehicleId);
      if (!Number.isInteger(vehicleId))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Veículo inválido." });

      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, vehicleId))
        .limit(1);
      if (!vehicle)
        throw new TRPCError({ code: "NOT_FOUND", message: "Veículo não encontrado." });

      if (input.tipo === "criar_os") {
        if (!hasPermission(role, "canManageServiceOrders"))
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para abrir OS." });
        const maintenanceType = String(dados.maintenanceType ?? "");
        const description = String(dados.description ?? "").trim();
        const priority = String(dados.priority ?? "media");
        if (!(MAINTENANCE_TYPES as readonly string[]).includes(maintenanceType))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo de manutenção inválido." });
        if (!description)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Descrição obrigatória." });
        const safePriority = (SEVERITY_LEVELS as readonly string[]).includes(priority)
          ? (priority as "baixa" | "media" | "alta")
          : "media";
        const osCode = `OS-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
        const result = await db.insert(serviceOrders).values({
          osCode,
          vehicleId,
          maintenanceType: maintenanceType as "preventiva" | "corretiva",
          description,
          priority: safePriority,
          status: "pendente_aprovacao",
          openedById: ctx.user.id,
          kmAtOpen: vehicle.currentKm,
        });
        await createAuditLog({
          user: ctx.user,
          action: "SERVICE_ORDER_OPEN",
          entityType: "service_order",
          entityId: result[0].insertId,
          newData: { osCode, vehicleId, via: "atena" },
          ...getRequestInfo(ctx.req),
        });
        return { tipo: input.tipo, id: result[0].insertId, osCode };
      }

      // registrar_ocorrencia
      if (!hasPermission(role, "canManageOccurrences"))
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para registrar ocorrência." });
      const description = String(dados.description ?? "").trim();
      const severity = String(dados.severity ?? "");
      const location = dados.location ? String(dados.location).slice(0, 255) : null;
      if (!description)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Descrição obrigatória." });
      if (!(SEVERITY_LEVELS as readonly string[]).includes(severity))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Gravidade inválida." });
      const result = await db.insert(occurrences).values({
        vehicleId,
        reportedById: ctx.user.id,
        occurredAt: new Date(),
        description,
        severity: severity as "baixa" | "media" | "alta",
        status: "aberto",
        location,
      });
      await createAuditLog({
        user: ctx.user,
        action: "OCCURRENCE_OPEN",
        entityType: "occurrence",
        entityId: result[0].insertId,
        newData: { vehicleId, severity, via: "atena" },
        ...getRequestInfo(ctx.req),
      });
      return { tipo: input.tipo, id: result[0].insertId };
    }),
});
