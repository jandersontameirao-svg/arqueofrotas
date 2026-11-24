import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CarFront,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Loader2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ACCIDENT_STATUSES } from "@shared/const";

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  em_reparo: "Em reparo",
  encerrado: "Encerrado",
};
const SEVERITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

type AccidentForm = {
  vehicleId: number;
  accidentDate: string;
  location: string;
  description: string;
  severity: "baixa" | "media" | "alta";
  status: (typeof ACCIDENT_STATUSES)[number];
  driverId: number | null;
  thirdPartyInvolved: boolean;
  thirdPartyDetails: string;
  insuranceClaimNumber: string;
  estimatedCost: string;
  finalCost: string;
  observations: string;
};

const emptyForm = (): AccidentForm => ({
  vehicleId: 0,
  accidentDate: new Date().toISOString().slice(0, 16),
  location: "",
  description: "",
  severity: "media",
  status: "aberto",
  driverId: null,
  thirdPartyInvolved: false,
  thirdPartyDetails: "",
  insuranceClaimNumber: "",
  estimatedCost: "",
  finalCost: "",
  observations: "",
});

function formatCurrency(value: string | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function VehicleAccidentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AccidentForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: accidents, isLoading, isError, error } =
    trpc.vehicleAccidents.listAll.useQuery();
  const { data: vehicles } = trpc.vehicles.list.useQuery({});
  const { data: users } = trpc.users.listActive.useQuery();
  const drivers = users?.filter(
    (u) => u.role === "motorista" || u.role === "admin" || u.role === "gestor_frota"
  );

  const onDone = (msg: string) => {
    toast.success(msg);
    utils.vehicleAccidents.invalidate();
    setDialogOpen(false);
    setForm(emptyForm());
    setEditId(null);
  };
  const createMutation = trpc.vehicleAccidents.create.useMutation({
    onSuccess: () => onDone("Sinistro registrado"),
    onError: (e) => toast.error(e.message || "Erro ao registrar sinistro"),
  });
  const updateMutation = trpc.vehicleAccidents.update.useMutation({
    onSuccess: () => onDone("Sinistro atualizado"),
    onError: (e) => toast.error(e.message || "Erro ao atualizar sinistro"),
  });
  const deleteMutation = trpc.vehicleAccidents.delete.useMutation({
    onSuccess: () => {
      toast.success("Sinistro excluído");
      utils.vehicleAccidents.invalidate();
      setDeleteId(null);
    },
    onError: (e) => {
      toast.error(e.message || "Erro ao excluir sinistro");
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };
  const openEdit = (a: NonNullable<typeof accidents>[number]) => {
    setEditId(a.id);
    setForm({
      vehicleId: a.vehicleId,
      accidentDate: new Date(a.accidentDate).toISOString().slice(0, 16),
      location: a.location ?? "",
      description: a.description,
      severity: a.severity as "baixa" | "media" | "alta",
      status: a.status as (typeof ACCIDENT_STATUSES)[number],
      driverId: null,
      thirdPartyInvolved: a.thirdPartyInvolved,
      thirdPartyDetails: "",
      insuranceClaimNumber: a.insuranceClaimNumber ?? "",
      estimatedCost: a.estimatedCost ?? "",
      finalCost: a.finalCost ?? "",
      observations: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.vehicleId || !form.description.trim()) {
      toast.error("Selecione o veículo e descreva o sinistro");
      return;
    }
    const base = {
      accidentDate: new Date(form.accidentDate),
      location: form.location.trim() || undefined,
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      driverId: form.driverId ?? undefined,
      thirdPartyInvolved: form.thirdPartyInvolved,
      thirdPartyDetails: form.thirdPartyDetails.trim() || undefined,
      insuranceClaimNumber: form.insuranceClaimNumber.trim() || undefined,
      estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
      finalCost: form.finalCost ? Number(form.finalCost) : undefined,
      observations: form.observations.trim() || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...base });
    } else {
      createMutation.mutate({ vehicleId: form.vehicleId, ...base });
    }
  };

  const filtered = accidents?.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.vehiclePlate?.toLowerCase().includes(q) ||
      a.vehicleModel?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.insuranceClaimNumber?.toLowerCase().includes(q)
    );
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      aberto: "bg-red-50 text-red-700 border-red-200",
      em_analise: "bg-yellow-50 text-yellow-700 border-yellow-200",
      em_reparo: "bg-blue-50 text-blue-700 border-blue-200",
      encerrado: "bg-green-50 text-green-700 border-green-200",
    };
    return (
      <Badge variant="outline" className={map[status] ?? ""}>
        {STATUS_LABELS[status] ?? status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Sinistros"
          description="Registre e acompanhe os sinistros da frota"
          icon={CarFront}
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Sinistro
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, modelo, descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CarFront className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Erro ao carregar sinistros</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Tente novamente mais tarde"}
            </p>
          </CardContent>
        </Card>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                  <CarFront className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0 grid gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {a.vehiclePlate}
                      {a.fleetNumber ? ` (Viatura ${a.fleetNumber})` : ""} -{" "}
                      {a.vehicleModel}
                    </span>
                    {statusBadge(a.status)}
                    <Badge variant="outline">
                      {SEVERITY_LABELS[a.severity] ?? a.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(a.accidentDate), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                    {a.insuranceClaimNumber && (
                      <span>Sinistro seg.: {a.insuranceClaimNumber}</span>
                    )}
                    {(a.finalCost || a.estimatedCost) && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(a.finalCost ?? a.estimatedCost)}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {a.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(a)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(a.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CarFront className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum sinistro registrado</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Tente ajustar sua busca" : "Registre o primeiro sinistro da frota"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editar Sinistro" : "Registrar Sinistro"}
            </DialogTitle>
            <DialogDescription>
              Dados do sinistro do veículo para acompanhamento e seguradora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Veículo *</Label>
              <Select
                value={form.vehicleId ? String(form.vehicleId) : ""}
                onValueChange={(v) =>
                  setForm({ ...form, vehicleId: Number(v) })
                }
                disabled={!!editId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.plate}
                      {v.fleetNumber ? ` (${v.fleetNumber})` : ""} - {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data/hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.accidentDate}
                  onChange={(e) =>
                    setForm({ ...form, accidentDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Gravidade</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) =>
                    setForm({ ...form, severity: v as AccidentForm["severity"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as AccidentForm["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCIDENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select
                  value={form.driverId ? String(form.driverId) : "none"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      driverId: v === "none" ? null : Number(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {drivers?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Onde ocorreu (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="O que aconteceu"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Custo estimado (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedCost}
                  onChange={(e) =>
                    setForm({ ...form, estimatedCost: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Custo final (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.finalCost}
                  onChange={(e) =>
                    setForm({ ...form, finalCost: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nº do sinistro na seguradora</Label>
              <Input
                value={form.insuranceClaimNumber}
                onChange={(e) =>
                  setForm({ ...form, insuranceClaimNumber: e.target.value })
                }
                placeholder="Opcional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Envolveu terceiros</Label>
                <p className="text-xs text-muted-foreground">
                  Outro veículo ou pessoa envolvida.
                </p>
              </div>
              <Switch
                checked={form.thirdPartyInvolved}
                onCheckedChange={(v) =>
                  setForm({ ...form, thirdPartyInvolved: v })
                }
              />
            </div>
            {form.thirdPartyInvolved && (
              <div className="space-y-2">
                <Label>Detalhes dos terceiros</Label>
                <Textarea
                  value={form.thirdPartyDetails}
                  onChange={(e) =>
                    setForm({ ...form, thirdPartyDetails: e.target.value })
                  }
                  rows={2}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observations}
                onChange={(e) =>
                  setForm({ ...form, observations: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sinistro</AlertDialogTitle>
            <AlertDialogDescription>
              O sinistro será removido da listagem. O registro é preservado para
              auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
