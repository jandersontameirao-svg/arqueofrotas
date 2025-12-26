import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isGestor } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column, Action } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, Plus, Eye, Edit, FileText, Wrench } from "lucide-react";
import { LABELS, VEHICLE_TYPES, VEHICLE_STATUSES } from "@shared/const";

type Vehicle = {
  id: number;
  plate: string;
  model: string;
  brand: string | null;
  year: number;
  vehicleType: string;
  status: string;
  unitName: string | null;
  currentKm: number | null;
  createdAt: Date;
};

export function VehiclesPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canEdit = isGestor(user);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: vehicles, isLoading } = trpc.vehicles.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as typeof VEHICLE_STATUSES[number]) : undefined,
    vehicleType: typeFilter !== "all" ? (typeFilter as typeof VEHICLE_TYPES[number]) : undefined,
  });

  const columns: Column<Vehicle>[] = [
    {
      key: "plate",
      header: "Placa",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-medium">{row.plate}</span>
      ),
    },
    {
      key: "model",
      header: "Modelo",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.model}</p>
          {row.brand && <p className="text-xs text-muted-foreground">{row.brand}</p>}
        </div>
      ),
    },
    {
      key: "vehicleType",
      header: "Tipo",
      sortable: true,
      cell: (row) => LABELS.vehicleTypes[row.vehicleType as keyof typeof LABELS.vehicleTypes] ?? row.vehicleType,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <StatusBadge status={row.status as "ativo" | "manutencao" | "baixado"} />
      ),
    },
    {
      key: "unitName",
      header: "Unidade",
      sortable: true,
      cell: (row) => row.unitName ?? "-",
    },
    {
      key: "currentKm",
      header: "Km Atual",
      sortable: true,
      cell: (row) =>
        row.currentKm ? row.currentKm.toLocaleString("pt-BR") + " km" : "-",
    },
    {
      key: "year",
      header: "Ano",
      sortable: true,
    },
  ];

  const actions: Action<Vehicle>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/vehicles/${row.id}`),
    },
    {
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/vehicles/${row.id}/edit`),
      hidden: () => !canEdit,
    },
    {
      label: "Documentos",
      icon: <FileText className="h-4 w-4" />,
      onClick: (row) => navigate(`/vehicles/${row.id}/documents`),
    },
    {
      label: "Abrir OS",
      icon: <Wrench className="h-4 w-4" />,
      onClick: (row) => navigate(`/service-orders/new?vehicleId=${row.id}`),
      hidden: () => !canEdit,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        description="Gerencie a frota de veículos"
        icon={Car}
        actions={
          canEdit && (
            <Button onClick={() => navigate("/vehicles/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
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
                  {VEHICLE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LABELS.vehicleStatuses[status]}
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
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LABELS.vehicleTypes[type]}
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
        data={(vehicles ?? []) as Vehicle[]}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por placa ou modelo..."
        searchKeys={["plate", "model", "brand"]}
        onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
        emptyMessage="Nenhum veículo encontrado"
      />
    </div>
  );
}
