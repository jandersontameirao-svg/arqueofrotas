import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isGestor, isManutencao } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column, Action } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, Plus, Eye, Edit, CheckCircle, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS, SERVICE_ORDER_STATUSES, MAINTENANCE_TYPES } from "@shared/const";

type ServiceOrder = {
  id: number;
  vehiclePlate: string;
  vehicleModel: string;
  maintenanceType: string;
  status: string;
  description: string;
  assignedToName: string | null;
  openedAt: Date;
};

export function ServiceOrdersPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canCreate = isGestor(user);
  const canManage = isManutencao(user);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: serviceOrders, isLoading } = trpc.serviceOrders.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as typeof SERVICE_ORDER_STATUSES[number]) : undefined,
    maintenanceType: typeFilter !== "all" ? (typeFilter as typeof MAINTENANCE_TYPES[number]) : undefined,
  });

  const columns: Column<ServiceOrder>[] = [
    {
      key: "id",
      header: "OS #",
      sortable: true,
      cell: (row) => <span className="font-mono font-medium">#{row.id}</span>,
    },
    {
      key: "vehiclePlate",
      header: "Veículo",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-mono font-medium">{row.vehiclePlate}</p>
          <p className="text-xs text-muted-foreground">{row.vehicleModel}</p>
        </div>
      ),
    },
    {
      key: "maintenanceType",
      header: "Tipo",
      sortable: true,
      cell: (row) => (
        <Badge variant={row.maintenanceType === "preventiva" ? "secondary" : "destructive"}>
          {LABELS.maintenanceTypes[row.maintenanceType as keyof typeof LABELS.maintenanceTypes]}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <StatusBadge
          status={row.status as "aberta" | "em_andamento" | "aguardando_pecas" | "concluida" | "cancelada"}
        />
      ),
    },
    {
      key: "description",
      header: "Descrição",
      cell: (row) => (
        <p className="max-w-xs truncate text-sm">{row.description}</p>
      ),
    },
    {
      key: "assignedToName",
      header: "Responsável",
      sortable: true,
      cell: (row) => row.assignedToName ?? "-",
    },
    {
      key: "openedAt",
      header: "Abertura",
      sortable: true,
      cell: (row) => format(new Date(row.openedAt), "dd/MM/yyyy", { locale: ptBR }),
    },
  ];

  const actions: Action<ServiceOrder>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/service-orders/${row.id}`),
    },
    {
      label: "Iniciar",
      icon: <Play className="h-4 w-4" />,
      onClick: (row) => navigate(`/service-orders/${row.id}?start=true`),
      hidden: (row) => row.status !== "aberta" || !canManage,
    },
    {
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/service-orders/${row.id}/edit`),
      hidden: (row) => row.status === "concluida" || row.status === "cancelada" || !canManage,
    },
    {
      label: "Concluir",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: (row) => navigate(`/service-orders/${row.id}?close=true`),
      hidden: (row) =>
        row.status === "concluida" || row.status === "cancelada" || row.status === "aberta" || !canManage,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        description="Gerencie as ordens de serviço de manutenção"
        icon={Wrench}
        actions={
          canCreate && (
            <Button onClick={() => navigate("/service-orders/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova OS
            </Button>
          )
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {SERVICE_ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LABELS.serviceOrderStatuses[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LABELS.maintenanceTypes[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        data={(serviceOrders ?? []) as ServiceOrder[]}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por veículo ou descrição..."
        searchKeys={["vehiclePlate", "vehicleModel", "description", "assignedToName"]}
        onRowClick={(row) => navigate(`/service-orders/${row.id}`)}
        emptyMessage="Nenhuma ordem de serviço encontrada"
      />
    </div>
  );
}
