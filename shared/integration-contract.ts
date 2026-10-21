import { z } from "zod";
export const INTEGRATION_VERSION = "1.0.0";
export const delegatedRequest = z.object({
  version: z.literal("1.0.0"),
  requestId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(100),
  originator: z.object({
    userId: z.number().int().positive(),
    groupId: z.literal("grupo-arqueo"),
    companyId: z.string().nullable(),
    unitId: z.number().int().positive().nullable(),
  }),
  delegation: z.object({
    service: z.literal("atena-os"),
    grantId: z.string().min(1),
    scopes: z.array(z.string().min(1)).min(1),
  }),
  operation: z.enum([
    "vehicles.list",
    "vehicles.getById",
    "vehicles.listAvailable",
    "checklists.submit",
    "reservations.pickup",
    "reservations.return",
    "reservations.reportProblem",
    "serviceOrders.create",
  ]),
  vehicleId: z.number().int().positive().optional(),
  expectedRevision: z.number().int().min(0).optional(),
  parameters: z.record(z.string(), z.unknown()),
});
export type DelegatedRequest = z.infer<typeof delegatedRequest>;
export interface VerifiedDelegation {
  userId: number;
  service: "atena-os";
  grantId: string;
  scopes: string[];
}
// Boundary contract only. The host must implement signature/expiry/audience checks before calling this function.
// This adapter cannot use a shared admin session; the executor receives the verified human originator.
export async function invokeDelegated(
  request: unknown,
  verified: VerifiedDelegation,
  execute: (request: DelegatedRequest) => Promise<unknown>
) {
  const input = delegatedRequest.parse(request);
  if (
    input.originator.userId !== verified.userId ||
    input.delegation.service !== verified.service ||
    input.delegation.grantId !== verified.grantId ||
    !verified.scopes.includes(input.operation) ||
    input.delegation.scopes.some(s => !verified.scopes.includes(s))
  )
    throw new Error("DELEGATION_FORBIDDEN");
  const write = ![
    "vehicles.list",
    "vehicles.getById",
    "vehicles.listAvailable",
  ].includes(input.operation);
  if (write && (!input.vehicleId || input.expectedRevision === undefined))
    throw new Error("REVISION_REQUIRED");
  const result = await execute(input);
  return {
    version: INTEGRATION_VERSION,
    requestId: input.requestId,
    state: "confirmed" as const,
    result,
  };
}
