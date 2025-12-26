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
import { Calendar, Plus, Eye, X, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS, RESERVATION_STATUSES } from "@shared/const";

type Reservation = {
  id: number;
  vehiclePlate: string;
  vehicleModel: string;
  userName: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  status: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
};

export function ReservationsPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canManage = isGestor(user);

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reservations, isLoading } = trpc.reservations.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as typeof RESERVATION_STATUSES[number]) : undefined,
  });

  const columns: Column<Reservation>[] = [
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
      key: "userName",
      header: "Responsável",
      sortable: true,
    },
    {
      key: "projectName",
      header: "Projeto",
      sortable: true,
    },
    {
      key: "startDate",
      header: "Período",
      sortable: true,
      cell: (row) => (
        <div className="text-sm">
          <p>{format(new Date(row.startDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          <p className="text-muted-foreground">
            até {format(new Date(row.endDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <StatusBadge status={row.status as "agendada" | "em_uso" | "concluida" | "cancelada"} />
      ),
    },
    {
      key: "checkInAt",
      header: "Check-in/out",
      cell: (row) => (
        <div className="text-xs">
          {row.checkInAt && (
            <p className="text-green-600">
              In: {format(new Date(row.checkInAt), "dd/MM HH:mm", { locale: ptBR })}
            </p>
          )}
          {row.checkOutAt && (
            <p className="text-blue-600">
              Out: {format(new Date(row.checkOutAt), "dd/MM HH:mm", { locale: ptBR })}
            </p>
          )}
          {!row.checkInAt && !row.checkOutAt && <span className="text-muted-foreground">-</span>}
        </div>
      ),
    },
  ];

  const actions: Action<Reservation>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/reservations/${row.id}`),
    },
    {
      label: "Fazer Check-in",
      icon: <LogIn className="h-4 w-4" />,
      onClick: (row) => navigate(`/reservations/${row.id}/checkin`),
      hidden: (row) => row.status !== "agendada",
    },
    {
      label: "Fazer Check-out",
      icon: <LogOut className="h-4 w-4" />,
      onClick: (row) => navigate(`/reservations/${row.id}/checkout`),
      hidden: (row) => row.status !== "em_uso",
    },
    {
      label: "Cancelar",
      icon: <X className="h-4 w-4" />,
      onClick: (row) => navigate(`/reservations/${row.id}?cancel=true`),
      variant: "destructive",
      hidden: (row) => row.status !== "agendada" && row.status !== "em_uso",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        description="Gerencie as reservas de veículos"
        icon={Calendar}
        actions={
          <Button onClick={() => navigate("/reservations/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Reserva
          </Button>
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
                  {RESERVATION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LABELS.reservationStatuses[status]}
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
        data={(reservations ?? []) as Reservation[]}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por veículo, responsável ou projeto..."
        searchKeys={["vehiclePlate", "vehicleModel", "userName", "projectName"]}
        onRowClick={(row) => navigate(`/reservations/${row.id}`)}
        emptyMessage="Nenhuma reserva encontrada"
      />
    </div>
  );
}
