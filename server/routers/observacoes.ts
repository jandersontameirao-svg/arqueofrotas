import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, authenticatedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { observacoes } from "../../drizzle/schema";
import { createAuditLog, getRequestInfo } from "../audit";
import { OBSERVACAO_CATEGORIES, OBSERVACAO_STATUSES } from "@shared/const";

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

function extractJson(text: string): Record<string, unknown> | null {
  let clean = text.trim();
  if (clean.startsWith("```"))
    clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
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

export const observacoesRouter = router({
  list: authenticatedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Enum definido como [aberta, em_analise, resolvida]: ordem do enum já é a
    // prioridade desejada (abertas primeiro, resolvidas por último).
    return db
      .select()
      .from(observacoes)
      .orderBy(asc(observacoes.status), desc(observacoes.createdAt));
  }),

  create: authenticatedProcedure
    .input(
      z.object({
        titulo: z.string().min(1).max(255),
        descricao: z.string().min(1).max(10000),
        categoria: z.enum(OBSERVACAO_CATEGORIES),
        area: z.string().max(100).optional(),
        // Aceita URL relativa do storage (print colado) e nomes vazios.
        imagens: z.array(z.string().max(2048)).max(8).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(observacoes).values({
        titulo: input.titulo.trim(),
        descricao: input.descricao.trim(),
        categoria: input.categoria,
        area: input.area?.trim() || null,
        imagens: input.imagens ?? [],
        status: "aberta",
        criadoPorId: ctx.user.id,
        criadoPorNome: ctx.user.name,
      });
      await createAuditLog({
        user: ctx.user,
        action: "CREATE",
        entityType: "notification",
        entityId: result[0].insertId,
        newData: { observacao: input.titulo, categoria: input.categoria },
        ...getRequestInfo(ctx.req),
      });
      return { id: result[0].insertId };
    }),

  updateStatus: authenticatedProcedure
    .input(z.object({ id: z.number(), status: z.enum(OBSERVACAO_STATUSES) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [before] = await db
        .select()
        .from(observacoes)
        .where(eq(observacoes.id, input.id))
        .limit(1);
      if (!before)
        throw new TRPCError({ code: "NOT_FOUND", message: "Observação não encontrada." });
      await db
        .update(observacoes)
        .set({ status: input.status })
        .where(eq(observacoes.id, input.id));
      await createAuditLog({
        user: ctx.user,
        action: "UPDATE",
        entityType: "notification",
        entityId: input.id,
        previousData: { status: before.status },
        newData: { status: input.status },
        ...getRequestInfo(ctx.req),
      });
      return { ok: true as const };
    }),

  delete: authenticatedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(observacoes).where(eq(observacoes.id, input.id));
      await createAuditLog({
        user: ctx.user,
        action: "DELETE",
        entityType: "notification",
        entityId: input.id,
        ...getRequestInfo(ctx.req),
      });
      return { ok: true as const };
    }),

  // A Atena transforma uma ideia solta num item de backlog pronto e acionável.
  // Não persiste nada: devolve a proposta para o usuário revisar e então salvar.
  organizarComAtena: authenticatedProcedure
    .input(z.object({ ideia: z.string().min(1).max(4000) }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é a Atena atuando como secretária de produto do ArqueoFrotas.
O usuário vai te dar uma ideia solta (reclamação, bug, pedido de melhoria ou característica desejada) sobre o SISTEMA.
Transforme-a num item de backlog claro e acionável, SEM inventar requisitos e preservando a intenção do usuário.

Regras:
- "descricao" deve conter: contexto + comportamento esperado + critério de pronto. Não adicione funcionalidades que o usuário não pediu.
- "categoria" é uma de: reclamacao, melhoria, bug, caracteristica.
- "area" é o módulo provável do sistema (ex.: "Veículos", "Ordens de Serviço", "Checklists", "Multas", "Dashboard"); se não der para inferir, use "".

Responda SOMENTE com um JSON válido, sem markdown:
{ "titulo": "...", "descricao": "...", "categoria": "reclamacao|melhoria|bug|caracteristica", "area": "..." }`,
          },
          { role: "user", content: input.ideia },
        ],
        maxTokens: 1200,
      });

      const parsed = extractJson(messageText(result.choices[0]?.message?.content));
      if (!parsed)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não consegui organizar a ideia. Tente reformular.",
        });

      const categoriaRaw = String(parsed.categoria ?? "melhoria");
      const categoria = (OBSERVACAO_CATEGORIES as readonly string[]).includes(
        categoriaRaw
      )
        ? categoriaRaw
        : "melhoria";
      return {
        titulo: String(parsed.titulo ?? "").slice(0, 255),
        descricao: String(parsed.descricao ?? ""),
        categoria,
        area: String(parsed.area ?? "").slice(0, 100),
      };
    }),
});
