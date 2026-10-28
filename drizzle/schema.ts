import { relations } from "drizzle-orm";
import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  longtext,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = mysqlEnum("role", [
  "admin",
  "gestor_frota",
  "motorista",
  "manutencao",
]);

export const vehicleTypeEnum = mysqlEnum("vehicleType", [
  "carro",
  "caminhonete",
  "moto",
  "van",
  "caminhao",
]);

export const vehicleStatusEnum = mysqlEnum("vehicleStatus", [
  "ativo",
  "manutencao",
  "baixado",
]);

export const documentTypeEnum = mysqlEnum("documentType", [
  "crlv",
  "seguro",
  "licenciamento",
  "outros",
]);

export const checklistResponseEnum = mysqlEnum("checklistResponse", [
  "ok",
  "nao_ok",
  "na",
]);

export const severityEnum = mysqlEnum("severity", ["baixa", "media", "alta"]);

export const occurrenceStatusEnum = mysqlEnum("occurrenceStatus", [
  "aberto",
  "em_tratamento",
  "encerrado",
]);

export const serviceOrderStatusEnum = mysqlEnum("serviceOrderStatus", [
  "rascunho",
  "pendente_aprovacao",
  "aprovada",
  "rejeitada",
  "aberta",
  "em_andamento",
  "aguardando_pecas",
  "concluida",
  "cancelada",
]);

export const approvalStatusEnum = mysqlEnum("approvalStatus", [
  "pendente",
  "aprovado",
  "rejeitado",
]);

export const notificationTypeEnum = mysqlEnum("notificationType", [
  "os_pendente_aprovacao",
  "os_aprovada",
  "os_rejeitada",
  "ocorrencia_nova",
  "ocorrencia_atualizada",
  "documento_vencendo",
  "multa_registrada",
  "geral",
]);

export const fineStatusEnum = mysqlEnum("fineStatus", [
  "pendente",
  "paga",
  "recorrida",
  "cancelada",
]);

export const maintenanceTypeEnum = mysqlEnum("maintenanceType", [
  "preventiva",
  "corretiva",
]);

export const reservationStatusEnum = mysqlEnum("reservationStatus", [
  "agendada",
  "em_uso",
  "concluida",
  "cancelada",
]);

// ============================================
// USERS TABLE
// ============================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum.default("motorista").notNull(),
  unitId: int("unitId"),
  phone: varchar("phone", { length: 20 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// UNITS TABLE (Unidades)
// ============================================

export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

// ============================================
// PROJECTS TABLE (Projetos/Centros de Custo)
// ============================================

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  client: varchar("client", { length: 255 }),
  unitId: int("unitId"),
  active: boolean("active").default(true).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ============================================
// VEHICLES TABLE (Veículos)
// ============================================

export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  plate: varchar("plate", { length: 10 }).notNull().unique(),
  model: varchar("model", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  year: int("year").notNull(),
  color: varchar("color", { length: 50 }),
  vehicleType: vehicleTypeEnum.notNull(),
  status: vehicleStatusEnum.default("ativo").notNull(),
  unitId: int("unitId"),
  defaultProjectId: int("defaultProjectId"),
  currentResponsibleId: int("currentResponsibleId"),
  revision: int("revision").default(0).notNull(),
  currentKm: int("currentKm").default(0).notNull(),
  chassi: varchar("chassi", { length: 50 }),
  renavam: varchar("renavam", { length: 20 }),
  trackingDeviceId: varchar("trackingDeviceId", { length: 100 }), // Para integração futura com telemetria
  registrationOrigin: mysqlEnum("registrationOrigin", ["manual", "ia"]).default(
    "manual"
  ),
  observations: text("observations"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

// ============================================
// VEHICLE DOCUMENTS TABLE (Documentos do Veículo)
// ============================================

export const vehicleDocuments = mysqlTable("vehicleDocuments", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  documentType: documentTypeEnum.notNull(),
  description: varchar("description", { length: 255 }),
  expirationDate: timestamp("expirationDate"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  fileSize: int("fileSize"),
  alert30Sent: boolean("alert30Sent").default(false),
  alert15Sent: boolean("alert15Sent").default(false),
  alert7Sent: boolean("alert7Sent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VehicleDocument = typeof vehicleDocuments.$inferSelect;
export type InsertVehicleDocument = typeof vehicleDocuments.$inferInsert;

// ============================================
// CHECKLIST TEMPLATES TABLE (Templates de Checklist)
// ============================================

export const checklistTemplates = mysqlTable("checklistTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  vehicleType: vehicleTypeEnum, // null = todos os tipos
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = typeof checklistTemplates.$inferInsert;

// ============================================
// CHECKLIST TEMPLATE ITEMS TABLE (Itens do Template)
// ============================================

export const checklistTemplateItems = mysqlTable("checklistTemplateItems", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }), // Ex: "Segurança", "Conservação"
  isCritical: boolean("isCritical").default(false).notNull(), // Se NÃO OK, exige foto e gera ocorrência
  order: int("order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistTemplateItem = typeof checklistTemplateItems.$inferSelect;
export type InsertChecklistTemplateItem =
  typeof checklistTemplateItems.$inferInsert;

// ============================================
// RESERVATIONS TABLE (Reservas/Alocações)
// ============================================

export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  purpose: text("purpose"),
  location: varchar("location", { length: 255 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  status: reservationStatusEnum.default("agendada").notNull(),
  // Check-in data
  checkInAt: timestamp("checkInAt"),
  checkInKm: int("checkInKm"),
  checkInFuel: int("checkInFuel"),
  returnChecklistId: int("returnChecklistId"),
  checkInCondition: text("checkInCondition"),
  checkInPhotoUrl: text("checkInPhotoUrl"),
  // Check-out data
  checkOutAt: timestamp("checkOutAt"),
  checkOutKm: int("checkOutKm"),
  checkOutFuel: int("checkOutFuel"),
  checkOutCondition: text("checkOutCondition"),
  checkOutPhotoUrl: text("checkOutPhotoUrl"),
  // Checklist reference
  checklistId: int("checklistId"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// ============================================
// CHECKLISTS TABLE (Checklists Executados)
// ============================================

export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  userId: int("userId").notNull(),
  templateId: int("templateId").notNull(),
  reservationId: int("reservationId"),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  km: int("km"),
  observations: text("observations"),
  hasIssues: boolean("hasIssues").default(false).notNull(),
  // Exclusão lógica
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedById: int("deletedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

// ============================================
// CHECKLIST RESPONSES TABLE (Respostas do Checklist)
// ============================================

export const checklistResponses = mysqlTable("checklistResponses", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(),
  templateItemId: int("templateItemId").notNull(),
  response: checklistResponseEnum.notNull(),
  comment: text("comment"),
  photoUrl: text("photoUrl"), // Obrigatório se item crítico e resposta = nao_ok
  occurrenceId: int("occurrenceId"), // Referência à ocorrência gerada automaticamente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistResponse = typeof checklistResponses.$inferSelect;
export type InsertChecklistResponse = typeof checklistResponses.$inferInsert;

// ============================================
// OCCURRENCES TABLE (Ocorrências/Avarias)
// ============================================

export const occurrences = mysqlTable("occurrences", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  reportedById: int("reportedById").notNull(),
  checklistResponseId: int("checklistResponseId"), // Se gerada por checklist
  serviceOrderId: int("serviceOrderId"), // Se vinculada a uma OS
  occurredAt: timestamp("occurredAt").notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description").notNull(),
  severity: severityEnum.notNull(),
  status: occurrenceStatusEnum.default("aberto").notNull(),
  closedAt: timestamp("closedAt"),
  closedById: int("closedById"),
  closureNotes: text("closureNotes"),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedById: int("deletedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Occurrence = typeof occurrences.$inferSelect;
export type InsertOccurrence = typeof occurrences.$inferInsert;

// ============================================
// OCCURRENCE ATTACHMENTS TABLE (Anexos de Ocorrência)
// ============================================

export const occurrenceAttachments = mysqlTable("occurrenceAttachments", {
  id: int("id").autoincrement().primaryKey(),
  occurrenceId: int("occurrenceId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 50 }),
  fileSize: int("fileSize"),
  description: varchar("description", { length: 255 }),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OccurrenceAttachment = typeof occurrenceAttachments.$inferSelect;
export type InsertOccurrenceAttachment =
  typeof occurrenceAttachments.$inferInsert;

// ============================================
// OCCURRENCE COMMENTS TABLE (Comentários de Ocorrência)
// ============================================

export const occurrenceComments = mysqlTable("occurrenceComments", {
  id: int("id").autoincrement().primaryKey(),
  occurrenceId: int("occurrenceId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OccurrenceComment = typeof occurrenceComments.$inferSelect;
export type InsertOccurrenceComment = typeof occurrenceComments.$inferInsert;

// ============================================
// MAINTENANCE PLANS TABLE (Planos de Manutenção Preventiva)
// ============================================

export const maintenancePlans = mysqlTable("maintenancePlans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  vehicleType: vehicleTypeEnum, // null = todos os tipos
  vehicleId: int("vehicleId"), // null = todos os veículos do tipo
  intervalKm: int("intervalKm"), // Intervalo em km
  intervalDays: int("intervalDays"), // Intervalo em dias
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type InsertMaintenancePlan = typeof maintenancePlans.$inferInsert;

// ============================================
// VEHICLE MAINTENANCE STATUS TABLE (Status de Manutenção por Veículo)
// ============================================

export const vehicleMaintenanceStatus = mysqlTable("vehicleMaintenanceStatus", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  maintenancePlanId: int("maintenancePlanId").notNull(),
  lastExecutedAt: timestamp("lastExecutedAt"),
  lastExecutedKm: int("lastExecutedKm"),
  nextDueDate: timestamp("nextDueDate"),
  nextDueKm: int("nextDueKm"),
  status: mysqlEnum("status", ["em_dia", "a_vencer", "vencida"])
    .default("em_dia")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VehicleMaintenanceStatus =
  typeof vehicleMaintenanceStatus.$inferSelect;
export type InsertVehicleMaintenanceStatus =
  typeof vehicleMaintenanceStatus.$inferInsert;

// ============================================
// SERVICE ORDERS TABLE (Ordens de Serviço)
// ============================================

export const serviceOrders = mysqlTable("serviceOrders", {
  id: int("id").autoincrement().primaryKey(),
  osCode: varchar("osCode", { length: 20 }).unique(), // Código único: OS-NNNN/YYYY
  vehicleId: int("vehicleId").notNull(),
  maintenanceType: maintenanceTypeEnum.notNull(),
  maintenancePlanId: int("maintenancePlanId"), // Se preventiva
  occurrenceId: int("occurrenceId"), // Se corretiva vinculada a ocorrência
  status: serviceOrderStatusEnum.default("aberta").notNull(),
  description: text("description").notNull(),
  priority: severityEnum.default("media").notNull(),
  // Datas
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  openedById: int("openedById").notNull(),
  assignedToId: int("assignedToId"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  completedById: int("completedById"),
  // Fornecedor/Oficina
  providerId: int("providerId"), // FK para serviceProviders
  supplierName: varchar("supplierName", { length: 255 }),
  supplierContact: varchar("supplierContact", { length: 100 }),
  // Aprovação
  approvedById: int("approvedById"),
  approvedAt: timestamp("approvedAt"),
  approvalNotes: text("approvalNotes"),
  // Km no momento da OS
  kmAtOpen: int("kmAtOpen"),
  // Notas
  executionNotes: text("executionNotes"),
  // Exclusão lógica
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedById: int("deletedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;

// ============================================
// SERVICE ORDER ITEMS TABLE (Itens da OS - Peças/Serviços)
// ============================================

export const serviceOrderItems = mysqlTable("serviceOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  serviceOrderId: int("serviceOrderId").notNull(),
  itemType: mysqlEnum("itemType", ["peca", "servico"]).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceOrderItem = typeof serviceOrderItems.$inferSelect;
export type InsertServiceOrderItem = typeof serviceOrderItems.$inferInsert;

// ============================================
// SERVICE ORDER ATTACHMENTS TABLE (Anexos da OS)
// ============================================

export const serviceOrderAttachments = mysqlTable("serviceOrderAttachments", {
  id: int("id").autoincrement().primaryKey(),
  serviceOrderId: int("serviceOrderId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 50 }),
  fileSize: int("fileSize"),
  description: varchar("description", { length: 255 }),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceOrderAttachment =
  typeof serviceOrderAttachments.$inferSelect;
export type InsertServiceOrderAttachment =
  typeof serviceOrderAttachments.$inferInsert;

// ============================================
// AUDIT LOGS TABLE (Logs de Auditoria)
// ============================================

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN, etc.
  entityType: varchar("entityType", { length: 100 }).notNull(), // vehicle, reservation, checklist, etc.
  entityId: int("entityId"),
  previousData: json("previousData"), // Estado anterior (para UPDATE/DELETE)
  newData: json("newData"), // Novo estado (para CREATE/UPDATE)
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  unit: one(units, {
    fields: [users.unitId],
    references: [units.id],
  }),
  reservations: many(reservations),
  checklists: many(checklists),
  reportedOccurrences: many(occurrences),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  vehicles: many(vehicles),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  unit: one(units, {
    fields: [projects.unitId],
    references: [units.id],
  }),
  reservations: many(reservations),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  unit: one(units, {
    fields: [vehicles.unitId],
    references: [units.id],
  }),
  defaultProject: one(projects, {
    fields: [vehicles.defaultProjectId],
    references: [projects.id],
  }),
  currentResponsible: one(users, {
    fields: [vehicles.currentResponsibleId],
    references: [users.id],
  }),
  documents: many(vehicleDocuments),
  reservations: many(reservations),
  checklists: many(checklists),
  occurrences: many(occurrences),
  serviceOrders: many(serviceOrders),
  maintenanceStatuses: many(vehicleMaintenanceStatus),
}));

export const vehicleDocumentsRelations = relations(
  vehicleDocuments,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleDocuments.vehicleId],
      references: [vehicles.id],
    }),
  })
);

export const checklistTemplatesRelations = relations(
  checklistTemplates,
  ({ many }) => ({
    items: many(checklistTemplateItems),
    checklists: many(checklists),
  })
);

export const checklistTemplateItemsRelations = relations(
  checklistTemplateItems,
  ({ one }) => ({
    template: one(checklistTemplates, {
      fields: [checklistTemplateItems.templateId],
      references: [checklistTemplates.id],
    }),
  })
);

export const reservationsRelations = relations(reservations, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [reservations.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [reservations.projectId],
    references: [projects.id],
  }),
  checklist: one(checklists, {
    fields: [reservations.checklistId],
    references: [checklists.id],
  }),
}));

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [checklists.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [checklists.userId],
    references: [users.id],
  }),
  template: one(checklistTemplates, {
    fields: [checklists.templateId],
    references: [checklistTemplates.id],
  }),
  responses: many(checklistResponses),
}));

export const checklistResponsesRelations = relations(
  checklistResponses,
  ({ one }) => ({
    checklist: one(checklists, {
      fields: [checklistResponses.checklistId],
      references: [checklists.id],
    }),
    templateItem: one(checklistTemplateItems, {
      fields: [checklistResponses.templateItemId],
      references: [checklistTemplateItems.id],
    }),
    occurrence: one(occurrences, {
      fields: [checklistResponses.occurrenceId],
      references: [occurrences.id],
    }),
  })
);

export const occurrencesRelations = relations(occurrences, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [occurrences.vehicleId],
    references: [vehicles.id],
  }),
  reportedBy: one(users, {
    fields: [occurrences.reportedById],
    references: [users.id],
  }),
  closedBy: one(users, {
    fields: [occurrences.closedById],
    references: [users.id],
  }),
  serviceOrder: one(serviceOrders, {
    fields: [occurrences.serviceOrderId],
    references: [serviceOrders.id],
  }),
  attachments: many(occurrenceAttachments),
  comments: many(occurrenceComments),
}));

export const occurrenceAttachmentsRelations = relations(
  occurrenceAttachments,
  ({ one }) => ({
    occurrence: one(occurrences, {
      fields: [occurrenceAttachments.occurrenceId],
      references: [occurrences.id],
    }),
    uploadedBy: one(users, {
      fields: [occurrenceAttachments.uploadedById],
      references: [users.id],
    }),
  })
);

export const occurrenceCommentsRelations = relations(
  occurrenceComments,
  ({ one }) => ({
    occurrence: one(occurrences, {
      fields: [occurrenceComments.occurrenceId],
      references: [occurrences.id],
    }),
    user: one(users, {
      fields: [occurrenceComments.userId],
      references: [users.id],
    }),
  })
);

export const maintenancePlansRelations = relations(
  maintenancePlans,
  ({ one, many }) => ({
    vehicle: one(vehicles, {
      fields: [maintenancePlans.vehicleId],
      references: [vehicles.id],
    }),
    vehicleStatuses: many(vehicleMaintenanceStatus),
    serviceOrders: many(serviceOrders),
  })
);

export const vehicleMaintenanceStatusRelations = relations(
  vehicleMaintenanceStatus,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleMaintenanceStatus.vehicleId],
      references: [vehicles.id],
    }),
    maintenancePlan: one(maintenancePlans, {
      fields: [vehicleMaintenanceStatus.maintenancePlanId],
      references: [maintenancePlans.id],
    }),
  })
);

export const serviceOrdersRelations = relations(
  serviceOrders,
  ({ one, many }) => ({
    vehicle: one(vehicles, {
      fields: [serviceOrders.vehicleId],
      references: [vehicles.id],
    }),
    maintenancePlan: one(maintenancePlans, {
      fields: [serviceOrders.maintenancePlanId],
      references: [maintenancePlans.id],
    }),
    occurrence: one(occurrences, {
      fields: [serviceOrders.occurrenceId],
      references: [occurrences.id],
    }),
    openedBy: one(users, {
      fields: [serviceOrders.openedById],
      references: [users.id],
    }),
    assignedTo: one(users, {
      fields: [serviceOrders.assignedToId],
      references: [users.id],
    }),
    completedBy: one(users, {
      fields: [serviceOrders.completedById],
      references: [users.id],
    }),
    items: many(serviceOrderItems),
    attachments: many(serviceOrderAttachments),
  })
);

export const serviceOrderItemsRelations = relations(
  serviceOrderItems,
  ({ one }) => ({
    serviceOrder: one(serviceOrders, {
      fields: [serviceOrderItems.serviceOrderId],
      references: [serviceOrders.id],
    }),
  })
);

export const serviceOrderAttachmentsRelations = relations(
  serviceOrderAttachments,
  ({ one }) => ({
    serviceOrder: one(serviceOrders, {
      fields: [serviceOrderAttachments.serviceOrderId],
      references: [serviceOrders.id],
    }),
    uploadedBy: one(users, {
      fields: [serviceOrderAttachments.uploadedById],
      references: [users.id],
    }),
  })
);

// ============================================
// VEHICLE PHOTOS TABLE (Fotos do Status do Veículo)
// ============================================

export const vehiclePhotos = mysqlTable("vehiclePhotos", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoType: mysqlEnum("photoType", [
    "frente",
    "traseira",
    "lateral_esquerda",
    "lateral_direita",
    "interior",
  ]).notNull(),
  description: varchar("description", { length: 255 }),
  uploadedById: int("uploadedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VehiclePhoto = typeof vehiclePhotos.$inferSelect;
export type InsertVehiclePhoto = typeof vehiclePhotos.$inferInsert;

export const vehiclePhotosRelations = relations(vehiclePhotos, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehiclePhotos.vehicleId],
    references: [vehicles.id],
  }),
  uploadedBy: one(users, {
    fields: [vehiclePhotos.uploadedById],
    references: [users.id],
  }),
}));

// ============================================
// SERVICE PROVIDERS TABLE (Prestadores de Serviço)
// ============================================

export const serviceProviders = mysqlTable("serviceProviders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  specialties: text("specialties"), // JSON array of specialties
  rating: decimal("rating", { precision: 3, scale: 2 }),
  observations: text("observations"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = typeof serviceProviders.$inferInsert;

// ============================================
// SERVICE ORDER APPROVALS TABLE (Histórico de Aprovações)
// ============================================

export const serviceOrderApprovals = mysqlTable("serviceOrderApprovals", {
  id: int("id").autoincrement().primaryKey(),
  serviceOrderId: int("serviceOrderId").notNull(),
  action: approvalStatusEnum.notNull(),
  userId: int("userId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceOrderApproval = typeof serviceOrderApprovals.$inferSelect;
export type InsertServiceOrderApproval =
  typeof serviceOrderApprovals.$inferInsert;

export const serviceOrderApprovalsRelations = relations(
  serviceOrderApprovals,
  ({ one }) => ({
    serviceOrder: one(serviceOrders, {
      fields: [serviceOrderApprovals.serviceOrderId],
      references: [serviceOrders.id],
    }),
    user: one(users, {
      fields: [serviceOrderApprovals.userId],
      references: [users.id],
    }),
  })
);

// ============================================
// VEHICLE FINES TABLE (Multas de Veículos)
// ============================================

export const vehicleFines = mysqlTable("vehicleFines", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  fineDate: timestamp("fineDate").notNull(),
  dueDate: timestamp("dueDate"),
  autoInfracao: varchar("autoInfracao", { length: 50 }), // Número do auto de infração
  infraction: varchar("infraction", { length: 500 }).notNull(), // Descrição da infração
  location: varchar("location", { length: 500 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }),
  points: int("points"),
  status: fineStatusEnum.default("pendente").notNull(),
  responsibleDriverId: int("responsibleDriverId"), // Motorista responsável
  paidAt: timestamp("paidAt"),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }),
  receiptUrl: text("receiptUrl"),
  observations: text("observations"),
  registeredById: int("registeredById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Exclusão lógica real: isDeleted=true remove da listagem, preserva para auditoria
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedById: int("deletedById"),
});

export type VehicleFine = typeof vehicleFines.$inferSelect;
export type InsertVehicleFine = typeof vehicleFines.$inferInsert;

export const vehicleFinesRelations = relations(vehicleFines, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleFines.vehicleId],
    references: [vehicles.id],
  }),
  responsibleDriver: one(users, {
    fields: [vehicleFines.responsibleDriverId],
    references: [users.id],
    relationName: "fineDriver",
  }),
  registeredBy: one(users, {
    fields: [vehicleFines.registeredById],
    references: [users.id],
    relationName: "fineRegisteredBy",
  }),
}));

// ============================================
// APP NOTIFICATIONS TABLE (Notificações Internas)
// ============================================

export const appNotifications = mysqlTable("appNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Destinatário
  type: notificationTypeEnum.notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  entityType: varchar("entityType", { length: 50 }), // 'service_order', 'occurrence', etc.
  entityId: int("entityId"), // ID da entidade relacionada
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppNotification = typeof appNotifications.$inferSelect;
export type InsertAppNotification = typeof appNotifications.$inferInsert;

export const appNotificationsRelations = relations(
  appNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [appNotifications.userId],
      references: [users.id],
    }),
  })
);

// Additive operational records. No existing files or readings are rewritten.
export const operationReceipts = mysqlTable("operationReceipts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  operation: varchar("operation", { length: 100 }).notNull(),
  requestId: varchar("requestId", { length: 100 }).notNull(),
  inputHash: varchar("inputHash", { length: 64 }).notNull(),
  result: json("result").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});
export const evidenceFiles = mysqlTable("evidenceFiles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 50 }).notNull(),
  content: longtext("content").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const odometerReadings = mysqlTable("odometerReadings", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  userId: int("userId").notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  originalKm: int("originalKm").notNull(),
  previousKm: int("previousKm").notNull(),
  correctedKm: int("correctedKm"),
  reason: text("reason"),
  collectedAt: timestamp("collectedAt").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});
export const vehicleHolds = mysqlTable("vehicleHolds", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  reason: text("reason").notNull(),
  userId: int("userId"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  releasedAt: timestamp("releasedAt"),
  releasedById: int("releasedById"),
});
export const activeVehicleUses = mysqlTable("activeVehicleUses", {
  vehicleId: int("vehicleId").primaryKey(),
  userId: int("userId").notNull().unique(),
  reservationId: int("reservationId").notNull().unique(),
});
export const domainEvents = mysqlTable("domainEvents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  requestId: varchar("requestId", { length: 100 }).notNull(),
  operation: varchar("operation", { length: 100 }).notNull(),
  resourceId: int("resourceId"),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const integrationReferences = mysqlTable(
  "integrationReferences",
  {
    id: int("id").autoincrement().primaryKey(),
    system: varchar("system", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 50 }).notNull(),
    localId: varchar("localId", { length: 100 }).notNull(),
    externalId: varchar("externalId", { length: 255 }).notNull(),
    version: varchar("version", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("integration_local_ref").on(
      table.system,
      table.entityType,
      table.localId
    ),
    uniqueIndex("integration_external_ref").on(
      table.system,
      table.entityType,
      table.externalId
    ),
  ]
);
export const eventAcknowledgements = mysqlTable("eventAcknowledgements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  consumer: varchar("consumer", { length: 100 }).notNull(),
  eventId: varchar("eventId", { length: 64 }).notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
});
