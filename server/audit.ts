import { getDb } from "./db";
import { auditLogs, type User } from "../drizzle/schema";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "CHECKLIST_SUBMIT"
  | "OCCURRENCE_OPEN"
  | "OCCURRENCE_CLOSE"
  | "SERVICE_ORDER_OPEN"
  | "SERVICE_ORDER_CLOSE"
  | "STATUS_CHANGE"
  | "KM_ADJUST"
  | "DOCUMENT_UPLOAD"
  | "RESERVATION_CREATE"
  | "RESERVATION_CANCEL";

export type EntityType =
  | "user"
  | "unit"
  | "project"
  | "vehicle"
  | "vehicle_document"
  | "checklist_template"
  | "checklist_template_item"
  | "reservation"
  | "checklist"
  | "checklist_response"
  | "occurrence"
  | "occurrence_attachment"
  | "occurrence_comment"
  | "maintenance_plan"
  | "vehicle_maintenance_status"
  | "service_order"
  | "service_order_item"
  | "service_order_attachment"
  | "service_provider"
  | "service_order_approval"
  | "vehicle_fine"
  | "notification";

interface AuditLogParams {
  user?: User | null;
  action: AuditAction;
  entityType: EntityType;
  entityId?: number;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Audit database unavailable");
  await db.insert(auditLogs).values({
    userId: params.user?.id ?? null,
    userName: params.user?.name ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    previousData: params.previousData
      ? sanitizeForAudit(params.previousData)
      : null,
    newData: params.newData ? sanitizeForAudit(params.newData) : null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

// Helper to extract request info for audit
export function getRequestInfo(req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}) {
  return {
    ipAddress:
      req.ip ?? req.headers?.["x-forwarded-for"]?.toString() ?? undefined,
    userAgent: req.headers?.["user-agent"]?.toString() ?? undefined,
  };
}

// Helper to sanitize data for audit (remove sensitive fields)
export function sanitizeForAudit<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = [
    "password",
    "token",
    "secret",
    "photoData",
    "fileData",
    "openId",
  ]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Helper to get changes between two objects
export function getChanges(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): { previous: Record<string, unknown>; current: Record<string, unknown> } {
  const changedPrevious: Record<string, unknown> = {};
  const changedCurrent: Record<string, unknown> = {};

  const allKeys = [...Object.keys(previous), ...Object.keys(current)];
  const uniqueKeys = Array.from(new Set(allKeys));

  for (const key of uniqueKeys) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      changedPrevious[key] = previous[key];
      changedCurrent[key] = current[key];
    }
  }

  return { previous: changedPrevious, current: changedCurrent };
}
