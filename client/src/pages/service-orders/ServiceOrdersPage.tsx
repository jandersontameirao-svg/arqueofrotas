import { filterRows } from "@shared/filter-rows";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wrench,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Play,
  Download,
  FileText,
  ChevronDown,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LABELS,
  SERVICE_ORDER_STATUSES,
  MAINTENANCE_TYPES,
} from "@shared/const";
import {
  exportToCSV,
  exportToPDF,
  formatDateTimeForExport,
} from "@/lib/export";
import { toast } from "sonner";

type ServiceOrder = {
  id: number;
  osCode: string | null;
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

  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deletingOS, setDeletingOS] = useState<ServiceOrder | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const utils = trpc.useUtils();
  const deleteMutation = trpc.serviceOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Ordem de serviço excluída com sucesso");
      setDeletingOS(null);
      setDeleteReason("");
      utils.serviceOrders.list.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Erro ao excluir ordem de serviço");
    },
  });

  const { data: serviceOrders, isLoading } = trpc.serviceOrders.list.useQuery({
    status:
      statusFilter !== "all"
        ? (statusFilter as (typeof SERVICE_ORDER_STATUSES)[number])
        : undefined,
    maintenanceType:
      typeFilter !== "all"
        ? (typeFilter as (typeof MAINTENANCE_TYPES)[number])
        : undefined,
  });

  const exportRows = filterRows(serviceOrders ?? [], tableSearch, [
    "osCode",
    "vehiclePlate",
    "vehicleModel",
    "description",
    "assignedToName",
  ]);

  const handleExportCSV = async () => {
    try {
      await utils.reports.authorize.fetch();
    } catch {
      toast.error("Você não tem permissão para exportar.");
      return;
    }
    if (!exportRows || exportRows.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const dataForExport = exportRows.map(o => ({
      ...o,
      osCodeFormatted: o.osCode || `#${o.id}`,
      maintenanceTypeLabel:
        LABELS.maintenanceTypes[
          o.maintenanceType as keyof typeof LABELS.maintenanceTypes
        ] || o.maintenanceType,
      statusLabel:
        LABELS.serviceOrderStatuses[
          o.status as keyof typeof LABELS.serviceOrderStatuses
        ] || o.status,
      openedAtFormatted: formatDateTimeForExport(o.openedAt),
    }));

    exportToCSV(
      dataForExport,
      `ordens_servico_${new Date().toISOString().split("T")[0]}`,
      [
        { key: "osCodeFormatted", label: "Código OS" },
        { key: "vehiclePlate", label: "Placa" },
        { key: "vehicleModel", label: "Modelo" },
        { key: "maintenanceTypeLabel", label: "Tipo" },
        { key: "statusLabel", label: "Status" },
        { key: "description", label: "Descrição" },
        { key: "assignedToName", label: "Responsável" },
        { key: "openedAtFormatted", label: "Abertura" },
      ]
    );
    toast.success("Relatório CSV exportado com sucesso!");
  };

  const handleExportPDF = async () => {
    try {
      await utils.reports.authorize.fetch();
    } catch {
      toast.error("Você não tem permissão para exportar.");
      return;
    }
    if (!exportRows || exportRows.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const dataForPDF = exportRows.map(o => ({
      osCode: o.osCode || `#${o.id}`,
      vehiclePlate: o.vehiclePlate,
      vehicleModel: o.vehicleModel,
      maintenanceType:
        LABELS.maintenanceTypes[
          o.maintenanceType as keyof typeof LABELS.maintenanceTypes
        ] || o.maintenanceType,
      status:
        LABELS.serviceOrderStatuses[
          o.status as keyof typeof LABELS.serviceOrderStatuses
        ] || o.status,
      description:
        o.description.length > 40
          ? o.description.substring(0, 40) + "..."
          : o.description,
      assignedToName: o.assignedToName ?? "-",
      openedAt: format(new Date(o.openedAt), "dd/MM/yyyy", { locale: ptBR }),
    }));

    await exportToPDF(
      dataForPDF,
      `ordens_servico_${new Date().toISOString().split("T")[0]}`,
      "Relatório de Ordens de Serviço",
      [
        { key: "osCode", label: "Código OS", width: 25 },
        { key: "vehiclePlate", label: "Placa", width: 20 },
        { key: "vehicleModel", label: "Modelo", width: 30 },
        { key: "maintenanceType", label: "Tipo", width: 25 },
        { key: "status", label: "Status", width: 25 },
        { key: "description", label: "Descrição", width: 45 },
        { key: "assignedToName", label: "Responsável", width: 30 },
        { key: "openedAt", label: "Abertura", width: 22 },
      ],
      {
        subtitle: `Total: ${exportRows.length} ordens de serviço`,
        orientation: "landscape",
      }
    );
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const columns: Column<ServiceOrder>[] = [
    {
      key: "osCode",
      header: "Código OS",
      sortable: true,
      cell: row => (
        <span className="font-mono font-medium text-primary">
          {row.osCode || `#${row.id}`}
        </span>
      ),
    },
    {
      key: "vehiclePlate",
      header: "Veículo",
      sortable: true,
      cell: row => (
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
      cell: row => (
        <Badge
          variant={
            row.maintenanceType === "preventiva" ? "secondary" : "destructive"
          }
        >
          {
            LABELS.maintenanceTypes[
              row.maintenanceType as keyof typeof LABELS.maintenanceTypes
            ]
          }
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: row => (
        <StatusBadge
          status={
            row.status as
              | "aberta"
              | "em_andamento"
              | "aguardando_pecas"
              | "concluida"
              | "cancelada"
          }
        />
      ),
    },
    {
      key: "description",
      header: "Descrição",
      cell: row => (
        <p className="max-w-xs truncate text-sm">{row.description}</p>
      ),
    },
    {
      key: "assignedToName",
      header: "Responsável",
      sortable: true,
      cell: row => row.assignedToName ?? "-",
    },
    {
      key: "openedAt",
      header: "Abertura",
      sortable: true,
      cell: row =>
        format(new Date(row.openedAt), "dd/MM/yyyy", { locale: ptBR }),
    },
  ];

  const actions: Action<ServiceOrder>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: row => navigate(`/service-orders/${row.id}`),
    },
    {
      label: "Iniciar",
      icon: <Play className="h-4 w-4" />,
      onClick: row => navigate(`/service-orders/${row.id}?start=true`),
      hidden: row => row.status !== "aberta" || !canManage,
    },
    {
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: row => navigate(`/service-orders/${row.id}/edit`),
      hidden: row =>
        row.status === "concluida" || row.status === "cancelada" || !canManage,
    },
    {
      label: "Concluir",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: row => navigate(`/service-orders/${row.id}?close=true`),
      hidden: row =>
        row.status === "concluida" ||
        row.status === "cancelada" ||
        row.status === "aberta" ||
        !canManage,
    },
    {
      label: "Excluir",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: row => {
        setDeletingOS(row);
        setDeleteReason("");
      },
      hidden: () => !isGestor(user),
      variant: "destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        description="Gerencie as ordens de serviço de manutenção"
        icon={Wrench}
        actions={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreate && (
              <Button onClick={() => navigate("/service-orders/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Nova OS
              </Button>
            )}
          </div>
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
                  {SERVICE_ORDER_STATUSES.map(status => (
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
                  {MAINTENANCE_TYPES.map(type => (
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
        onSearchChange={setTableSearch}
        searchPlaceholder="Buscar por código, veículo ou descrição..."
        searchKeys={[
          "osCode",
          "vehiclePlate",
          "vehicleModel",
          "description",
          "assignedToName",
        ]}
        onRowClick={row => navigate(`/service-orders/${row.id}`)}
        emptyMessage="Nenhuma ordem de serviço encontrada"
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={!!deletingOS}
        onOpenChange={open => {
          if (!open) {
            setDeletingOS(null);
            setDeleteReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Excluir a OS{" "}
              <strong>{deletingOS?.osCode || `#${deletingOS?.id}`}</strong>?
              Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Exclusão *</Label>
              <Textarea
                placeholder="Informe o motivo da exclusão..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingOS(null);
                setDeleteReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingOS &&
                deleteMutation.mutate({
                  id: deletingOS.id,
                  reason: deleteReason,
                })
              }
              disabled={!deleteReason.trim() || deleteMutation.isPending}
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
