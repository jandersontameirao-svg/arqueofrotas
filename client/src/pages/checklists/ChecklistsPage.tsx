import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isGestor } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Column, Action } from "@/components/tables/DataTable";
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
import { ClipboardCheck, Plus, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Checklist = {
  id: number;
  vehiclePlate: string;
  vehicleModel: string;
  templateName: string;
  userName: string | null;
  km: number | null;
  hasIssues: boolean;
  createdAt: Date;
};

export function ChecklistsPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canManage = isGestor(user);

  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: checklists, isLoading } = trpc.checklists.list.useQuery({
    hasIssues: typeFilter === "issues" ? true : undefined,
  });

  const columns: Column<Checklist>[] = [
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
      key: "templateName",
      header: "Template",
      sortable: true,
    },

    {
      key: "hasIssues",
      header: "Status",
      cell: (row) => (
        row.hasIssues ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Com Problemas
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            OK
          </Badge>
        )
      ),
    },
    {
      key: "km",
      header: "Km",
      sortable: true,
      cell: (row) => row.km?.toLocaleString("pt-BR") ?? "-",
    },
    {
      key: "userName",
      header: "Executado por",
      sortable: true,
      cell: (row) => row.userName ?? "-",
    },
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    },
  ];

  const actions: Action<Checklist>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/checklists/${row.id}`),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Histórico de checklists executados"
        icon={ClipboardCheck}
        actions={
          <Button onClick={() => navigate("/checklists/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Checklist
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                  <SelectItem value="diario">Diário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        data={(checklists ?? []) as Checklist[]}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por veículo..."
        searchKeys={["vehiclePlate", "vehicleModel", "userName", "templateName"]}
        onRowClick={(row) => navigate(`/checklists/${row.id}`)}
        emptyMessage="Nenhum checklist encontrado"
      />
    </div>
  );
}
