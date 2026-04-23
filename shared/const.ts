export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;

// Error messages
export const UNAUTHED_ERR_MSG = 'Por favor, faça login (10001)';
export const NOT_ADMIN_ERR_MSG = 'Você não tem permissão de administrador (10002)';
export const NOT_GESTOR_ERR_MSG = 'Você não tem permissão de gestor de frota (10003)';
export const NOT_MANUTENCAO_ERR_MSG = 'Você não tem permissão de manutenção (10004)';
export const FORBIDDEN_ERR_MSG = 'Acesso negado (10005)';

// User roles
export const USER_ROLES = ['admin', 'gestor_frota', 'motorista', 'manutencao'] as const;
export type UserRole = typeof USER_ROLES[number];

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageUnits: true,
    canManageProjects: true,
    canManageVehicles: true,
    canManageChecklistTemplates: true,
    canManageMaintenancePlans: true,
    canViewAllReservations: true,
    canApproveReservations: true,
    canManageOccurrences: true,
    canManageServiceOrders: true,
    canViewDashboards: true,
    canExportReports: true,
    canViewAuditLogs: true,
    canAdjustKm: true,
    canDeleteVehicle: true,
    canCloseOccurrence: true,
    canCloseServiceOrder: true,
  },
  gestor_frota: {
    canManageUsers: false,
    canManageUnits: false,
    canManageProjects: false,
    canManageVehicles: true,
    canManageChecklistTemplates: false,
    canManageMaintenancePlans: true,
    canViewAllReservations: true,
    canApproveReservations: true,
    canManageOccurrences: true,
    canManageServiceOrders: true,
    canViewDashboards: true,
    canExportReports: true,
    canViewAuditLogs: false,
    canAdjustKm: true,
    canDeleteVehicle: false,
    canCloseOccurrence: true,
    canCloseServiceOrder: true,
  },
  motorista: {
    canManageUsers: false,
    canManageUnits: false,
    canManageProjects: false,
    canManageVehicles: false,
    canManageChecklistTemplates: false,
    canManageMaintenancePlans: false,
    canViewAllReservations: false,
    canApproveReservations: false,
    canManageOccurrences: false,
    canManageServiceOrders: false,
    canViewDashboards: false,
    canExportReports: false,
    canViewAuditLogs: false,
    canAdjustKm: false,
    canDeleteVehicle: false,
    canCloseOccurrence: false,
    canCloseServiceOrder: false,
  },
  manutencao: {
    canManageUsers: false,
    canManageUnits: false,
    canManageProjects: false,
    canManageVehicles: false,
    canManageChecklistTemplates: false,
    canManageMaintenancePlans: false,
    canViewAllReservations: false,
    canApproveReservations: false,
    canManageOccurrences: false,
    canManageServiceOrders: true,
    canViewDashboards: false,
    canExportReports: false,
    canViewAuditLogs: false,
    canAdjustKm: false,
    canDeleteVehicle: false,
    canCloseOccurrence: false,
    canCloseServiceOrder: true,
  },
} as const;

// Vehicle types
export const VEHICLE_TYPES = ['carro', 'caminhonete', 'moto', 'van', 'caminhao'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

// Vehicle statuses
export const VEHICLE_STATUSES = ['ativo', 'manutencao', 'baixado'] as const;
export type VehicleStatus = typeof VEHICLE_STATUSES[number];

// Document types
export const DOCUMENT_TYPES = ['crlv', 'seguro', 'licenciamento', 'outros'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

// Checklist responses
export const CHECKLIST_RESPONSES = ['ok', 'nao_ok', 'na'] as const;
export type ChecklistResponseType = typeof CHECKLIST_RESPONSES[number];

// Severity levels
export const SEVERITY_LEVELS = ['baixa', 'media', 'alta'] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];

// Occurrence statuses
export const OCCURRENCE_STATUSES = ['aberto', 'em_tratamento', 'encerrado'] as const;
export type OccurrenceStatus = typeof OCCURRENCE_STATUSES[number];

// Service order statuses
export const SERVICE_ORDER_STATUSES = ['rascunho', 'pendente_aprovacao', 'aprovada', 'rejeitada', 'aberta', 'em_andamento', 'aguardando_pecas', 'concluida', 'cancelada'] as const;
export type ServiceOrderStatus = typeof SERVICE_ORDER_STATUSES[number];

// Approval statuses
export const APPROVAL_STATUSES = ['pendente', 'aprovado', 'rejeitado'] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];

// Notification types
export const NOTIFICATION_TYPES = ['os_pendente_aprovacao', 'os_aprovada', 'os_rejeitada', 'ocorrencia_nova', 'ocorrencia_atualizada', 'documento_vencendo', 'multa_registrada', 'geral'] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

// Fine statuses
export const FINE_STATUSES = ['pendente', 'paga', 'recorrida', 'cancelada'] as const;
export type FineStatus = typeof FINE_STATUSES[number];

// Maintenance types
export const MAINTENANCE_TYPES = ['preventiva', 'corretiva'] as const;
export type MaintenanceType = typeof MAINTENANCE_TYPES[number];

// Reservation statuses
export const RESERVATION_STATUSES = ['agendada', 'em_uso', 'concluida', 'cancelada'] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

// Labels for display (pt-BR)
export const LABELS = {
  roles: {
    admin: 'Administrador',
    gestor_frota: 'Gestor de Frota',
    motorista: 'Motorista/Colaborador',
    manutencao: 'Manutenção',
  },
  vehicleTypes: {
    carro: 'Carro',
    caminhonete: 'Caminhonete',
    moto: 'Moto',
    van: 'Van',
    caminhao: 'Caminhão',
  },
  vehicleStatuses: {
    ativo: 'Ativo',
    manutencao: 'Em Manutenção',
    baixado: 'Baixado',
  },
  documentTypes: {
    crlv: 'CRLV',
    seguro: 'Seguro',
    licenciamento: 'Licenciamento',
    outros: 'Outros',
  },
  checklistResponses: {
    ok: 'OK',
    nao_ok: 'Não OK',
    na: 'N/A',
  },
  severityLevels: {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
  },
  occurrenceStatuses: {
    aberto: 'Aberto',
    em_tratamento: 'Em Tratamento',
    encerrado: 'Encerrado',
  },
  serviceOrderStatuses: {
    rascunho: 'Rascunho',
    pendente_aprovacao: 'Pendente de Aprovação',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
    aberta: 'Aberta',
    em_andamento: 'Em Andamento',
    aguardando_pecas: 'Aguardando Peças',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  },
  approvalStatuses: {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
  },
  fineStatuses: {
    pendente: 'Pendente',
    paga: 'Paga',
    recorrida: 'Recorrida',
    cancelada: 'Cancelada',
  },
  notificationTypes: {
    os_pendente_aprovacao: 'OS Pendente de Aprovação',
    os_aprovada: 'OS Aprovada',
    os_rejeitada: 'OS Rejeitada',
    ocorrencia_nova: 'Nova Ocorrência',
    ocorrencia_atualizada: 'Ocorrência Atualizada',
    documento_vencendo: 'Documento Vencendo',
    multa_registrada: 'Multa Registrada',
    geral: 'Geral',
  },
  maintenanceTypes: {
    preventiva: 'Preventiva',
    corretiva: 'Corretiva',
  },
  reservationStatuses: {
    agendada: 'Agendada',
    em_uso: 'Em Uso',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  },
} as const;
