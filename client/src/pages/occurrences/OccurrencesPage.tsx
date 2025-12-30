import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isGestor } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column, Action } from "@/components/tables/DataTable";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
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
import { AlertTriangle, Plus, Eye, Edit, CheckCircle, Download, FileText, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS, OCCURRENCE_STATUSES, SEVERITY_LEVELS } from "@shared/const";
import { exportToCSV, exportToPDF, formatDateTimeForExport } from "@/lib/export";
import { toast } from "sonner";

type Occurrence = {
  id: number;
  vehiclePlate: string;
  vehicleModel: string;
  reportedByName: string | null;
  severity: string;
  status: string;
  description: string;
  createdAt: Date;
};

export function OccurrencesPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canManage = isGestor(user);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: occurrences, isLoading } = trpc.occurrences.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as typeof OCCURRENCE_STATUSES[number]) : undefined,
    severity: severityFilter !== "all" ? (severityFilter as typeof SEVERITY_LEVELS[number]) : undefined,
  });

  const handleExportCSV = () => {
    if (!occurrences || occurrences.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const dataForExport = occurrences.map((o) => ({
      ...o,
      severityLabel: LABELS.severityLevels[o.severity as keyof typeof LABELS.severityLevels] || o.severity,
      statusLabel: LABELS.occurrenceStatuses[o.status as keyof typeof LABELS.occurrenceStatuses] || o.status,
      createdAtFormatted: formatDateTimeForExport(o.createdAt),
    }));

    exportToCSV(
      dataForExport,
      `ocorrencias_${new Date().toISOString().split("T")[0]}`,
      [
        { key: "id", label: "ID" },
        { key: "vehiclePlate", label: "Placa" },
        { key: "vehicleModel", label: "Modelo" },
        { key: "severityLabel", label: "Severidade" },
        { key: "statusLabel", label: "Status" },
        { key: "description", label: "Descrição" },
        { key: "reportedByName", label: "Reportado por" },
        { key: "createdAtFormatted", label: "Data" },
      ]
    );
    toast.success("Relatório CSV exportado com sucesso!");
  };

  const handleExportPDF = async () => {
    if (!occurrences || occurrences.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const dataForPDF = occurrences.map((o) => ({
      id: `#${o.id}`,
      vehiclePlate: o.vehiclePlate,
      vehicleModel: o.vehicleModel,
      severity: LABELS.severityLevels[o.severity as keyof typeof LABELS.severityLevels] || o.severity,
      status: LABELS.occurrenceStatuses[o.status as keyof typeof LABELS.occurrenceStatuses] || o.status,
      description: o.description.length > 50 ? o.description.substring(0, 50) + "..." : o.description,
      reportedByName: o.reportedByName ?? "-",
      createdAt: format(new Date(o.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    }));

    await exportToPDF(
      dataForPDF,
      `ocorrencias_${new Date().toISOString().split("T")[0]}`,
      "Relatório de Ocorrências",
      [
        { key: "id", label: "ID", width: 15 },
        { key: "vehiclePlate", label: "Placa", width: 20 },
        { key: "vehicleModel", label: "Modelo", width: 30 },
        { key: "severity", label: "Severidade", width: 20 },
        { key: "status", label: "Status", width: 25 },
        { key: "description", label: "Descrição", width: 50 },
        { key: "reportedByName", label: "Reportado por", width: 30 },
        { key: "createdAt", label: "Data", width: 30 },
      ],
      {
        subtitle: `Total: ${occurrences.length} ocorrências`,
        orientation: "landscape",
      }
    );
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const columns: Column<Occurrence>[] = [
    {
      key: "id",
      header: "#",
      sortable: true,
      cell: (row) => <span className="font-mono text-muted-foreground">#{row.id}</span>,
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
      key: "severity",
      header: "Severidade",
      sortable: true,
      cell: (row) => <SeverityBadge severity={row.severity as "alta" | "media" | "baixa"} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <StatusBadge status={row.status as "aberto" | "em_tratamento" | "encerrado"} />
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
      key: "reportedByName",
      header: "Reportado por",
      sortable: true,
    },
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    },
  ];

  const actions: Action<Occurrence>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/occurrences/${row.id}`),
    },
    {
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/occurrences/${row.id}/edit`),
      hidden: (row) => row.status === "encerrado" || !canManage,
    },
    {
      label: "Encerrar",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: (row) => navigate(`/occurrences/${row.id}?close=true`),
      hidden: (row) => row.status === "encerrado" || !canManage,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ocorrências"
        description="Gerencie ocorrências e avarias dos veículos"
        icon={AlertTriangle}
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
            <Button onClick={() => navigate("/occurrences/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Ocorrência
            </Button>
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
                  {OCCURRENCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LABELS.occurrenceStatuses[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Severidades</SelectItem>
                  {SEVERITY_LEVELS.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {LABELS.severityLevels[severity]}
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
        data={(occurrences ?? []) as Occurrence[]}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por veículo ou descrição..."
        searchKeys={["vehiclePlate", "vehicleModel", "description", "reportedByName"]}
        onRowClick={(row) => navigate(`/occurrences/${row.id}`)}
        emptyMessage="Nenhuma ocorrência encontrada"
      />
    </div>
  );
}
