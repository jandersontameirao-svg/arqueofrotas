import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  checklists,
  checklistResponses,
  checklistTemplates,
  checklistTemplateItems,
  vehicles,
  occurrences,
  reservations,
  type User,
} from "../../drizzle/schema";
import type { Database } from "./runtime";
import { persistPhoto, decodePhoto } from "./evidence";
import { recordKm } from "./odometer";
export const checklistInput = z.object({
  vehicleId: z.number().int().positive(),
  templateId: z.number().int().positive(),
  km: z.number().int().min(0).optional(),
  observations: z.string().max(10000).optional(),
  collectedAt: z.date().optional(),
  requestId: z.string().max(100).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
  responses: z
    .array(
      z.object({
        templateItemId: z.number().int().positive(),
        response: z.enum(["ok", "nao_ok", "na"]),
        comment: z.string().max(5000).optional(),
        photoData: z.string().max(12000000).optional(),
        photoFileName: z.string().max(255).optional(),
      })
    )
    .max(500),
});
export function validateChecklist(
  template: { active: boolean; vehicleType: string | null } | undefined,
  vehicleType: string,
  items: { id: number; isCritical: boolean }[],
  responses: z.infer<typeof checklistInput>["responses"]
) {
  if (
    !template?.active ||
    (template.vehicleType && template.vehicleType !== vehicleType)
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Template inativo ou não aplicável ao veículo",
    });
  const ids = new Set(responses.map(r => r.templateItemId));
  if (
    !items.length ||
    ids.size !== responses.length ||
    responses.length !== items.length ||
    items.some(i => !ids.has(i.id))
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Responda exatamente uma vez todos os itens ativos deste template",
    });
  for (const response of responses) {
    const item = items.find(i => i.id === response.templateItemId)!;
    if (response.response === "nao_ok" && !response.photoData)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Não conformidade exige foto, conforme o onboarding",
      });
    if (response.photoData)
      decodePhoto(response.photoData, response.photoFileName);
  }
}
export async function submitChecklist(
  db: Database,
  user: User,
  input: z.infer<typeof checklistInput>
) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, input.vehicleId))
    .for("update");
  if (!vehicle?.active)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Veículo não encontrado",
    });
  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, input.templateId));
  const items = await db
    .select()
    .from(checklistTemplateItems)
    .where(
      and(
        eq(checklistTemplateItems.templateId, input.templateId),
        eq(checklistTemplateItems.active, true)
      )
    );
  validateChecklist(template, vehicle.vehicleType, items, input.responses);
  const collectedAt = input.collectedAt ?? new Date();
  if (collectedAt.getTime() > Date.now() + 300000)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Horário da coleta no futuro",
    });
  if (input.km !== undefined)
    await recordKm(db, user, vehicle.id, input.km, "checklist", collectedAt);
  const hasIssues = input.responses.some(r => r.response === "nao_ok");
  const [activeUse] = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.vehicleId, vehicle.id),
        eq(reservations.userId, user.id),
        eq(reservations.status, "em_uso")
      )
    );
  const result = await db
    .insert(checklists)
    .values({
      reservationId: activeUse?.id,
      vehicleId: vehicle.id,
      userId: user.id,
      templateId: input.templateId,
      km: input.km,
      observations: input.observations,
      executedAt: collectedAt,
      hasIssues,
    });
  const id = result[0].insertId;
  let critical = false;
  for (const response of input.responses) {
    const item = items.find(i => i.id === response.templateItemId)!;
    const photo = response.photoData
      ? await persistPhoto(
          db,
          user.id,
          vehicle.id,
          response.photoData,
          response.photoFileName
        )
      : undefined;
    let occurrenceId: number | undefined;
    if (response.response === "nao_ok") {
      critical = critical || item.isCritical;
      const occurrence = await db
        .insert(occurrences)
        .values({
          vehicleId: vehicle.id,
          reportedById: user.id,
          occurredAt: collectedAt,
          description: `Checklist ${id}: ${item.description} — ${response.comment || "Não conforme"}`,
          severity: item.isCritical ? "alta" : "media",
          status: "aberto",
        });
      occurrenceId = occurrence[0].insertId;
    }
    const insertedResponse = await db
      .insert(checklistResponses)
      .values({
        checklistId: id,
        templateItemId: item.id,
        response: response.response,
        comment: response.comment,
        photoUrl: photo?.url,
        occurrenceId,
      });
    if (occurrenceId)
      await db
        .update(occurrences)
        .set({ checklistResponseId: insertedResponse[0].insertId })
        .where(eq(occurrences.id, occurrenceId));
  }
  if (critical && vehicle.status !== "baixado")
    await db
      .update(vehicles)
      .set({ status: "manutencao" })
      .where(eq(vehicles.id, vehicle.id));
  return { id, hasIssues, critical };
}
