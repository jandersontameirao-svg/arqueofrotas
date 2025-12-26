import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AuditLog = {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  previousData: unknown;
  newData: unknown;
  ipAddress: string | null;
  createdAt: Date;
};

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: "Criação", color: "bg-green-100 text-green-800" },
  update: { label: "Atualização", color: "bg-blue-100 text-blue-800" },
  delete: { label: "Exclusão", color: "bg-red-100 text-red-800" },
  login: { label: "Login", color: "bg-purple-100 text-purple-800" },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-800" },
  checkin: { label: "Check-in", color: "bg-cyan-100 text-cyan-800" },
  checkout: { label: "Check-out", color: "bg-cyan-100 text-cyan-800" },
  status_change: { label: "Mudança de Status", color: "bg-yellow-100 text-yellow-800" },
};

const entityLabels: Record<string, string> = {
  vehicle: "Veículo",
  user: "Usuário",
  reservation: "Reserva",
  checklist: "Checklist",
  occurrence: "Ocorrência",
  service_order: "Ordem de Serviço",
  unit: "Unidade",
  project: "Projeto",
  maintenance_plan: "Plano de Manutenção",
  vehicle_document: "Documento",
};

export function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: logs, isLoading } = trpc.auditLogs.list.useQuery({
    action: actionFilter !== "all" ? actionFilter : undefined,
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: 100,
  });

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "Data/Hora",
      sortable: true,
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
    },
    {
      key: "userName",
      header: "Usuário",
      sortable: true,
      cell: (row) => row.userName ?? "Sistema",
    },
    {
      key: "action",
      header: "Ação",
      sortable: true,
      cell: (row) => {
        const config = actionLabels[row.action] ?? { label: row.action, color: "bg-gray-100 text-gray-800" };
        return (
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "entityType",
      header: "Entidade",
      sortable: true,
      cell: (row) => entityLabels[row.entityType] ?? row.entityType,
    },
    {
      key: "entityId",
      header: "ID",
      cell: (row) => row.entityId ? `#${row.entityId}` : "-",
    },
    {
      key: "ipAddress",
      header: "IP",
      cell: (row) => row.ipAddress ?? "-",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Auditoria"
        description="Histórico de todas as ações realizadas no sistema"
        icon={FileText}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.entries(actionLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entidade</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  {Object.entries(entityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        data={(logs ?? []) as AuditLog[]}
        columns={columns}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por usuário..."
        searchKeys={["userName"]}
        emptyMessage="Nenhum log encontrado"
      />
    </div>
  );
}
