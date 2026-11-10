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
  FolderKanban,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProjectForm = {
  name: string;
  code: string;
  description: string;
  client: string;
  unitId: number | null;
  active: boolean;
};

const emptyForm: ProjectForm = {
  name: "",
  code: "",
  description: "",
  client: "",
  unitId: null,
  active: true,
};

export function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: projects, isLoading, isError, error } =
    trpc.projects.list.useQuery();
  const { data: units } = trpc.units.listActive.useQuery();

  const upsertOptions = {
    onSuccess: () => {
      utils.projects.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message || "Erro ao salvar projeto"),
  };

  const createMutation = trpc.projects.create.useMutation({
    ...upsertOptions,
    onSuccess: () => {
      toast.success("Projeto criado com sucesso");
      upsertOptions.onSuccess();
    },
  });
  const updateMutation = trpc.projects.update.useMutation({
    ...upsertOptions,
    onSuccess: () => {
      toast.success("Projeto atualizado com sucesso");
      upsertOptions.onSuccess();
    },
  });
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Projeto desativado");
      utils.projects.invalidate();
      setDeleteId(null);
    },
    onError: (e) => {
      toast.error(e.message || "Erro ao desativar projeto");
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: NonNullable<typeof projects>[number]) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      code: p.code ?? "",
      description: p.description ?? "",
      client: p.client ?? "",
      unitId: p.unitId ?? null,
      active: p.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Nome e código são obrigatórios");
      return;
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      client: form.client.trim() || undefined,
      unitId: form.unitId ?? undefined,
      active: form.active,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload, unitId: form.unitId });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = projects?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.client?.toLowerCase().includes(q)
    );
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Projetos"
          description="Cadastre e gerencie os projetos (centros de custo) da frota"
          icon={FolderKanban}
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código, cliente..."
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
            <FolderKanban className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Erro ao carregar projetos</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Tente novamente mais tarde"}
            </p>
          </CardContent>
        </Card>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 grid gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.code && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {p.code}
                      </span>
                    )}
                    {p.active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {p.client && <span>Cliente: {p.client}</span>}
                    {p.unitName && <span>Unidade: {p.unitName}</span>}
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {p.description}
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
                      <DropdownMenuItem onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {p.active && (
                        <DropdownMenuItem
                          onClick={() => setDeleteId(p.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Desativar
                        </DropdownMenuItem>
                      )}
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
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum projeto cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? "Tente ajustar sua busca"
                : "Cadastre o primeiro projeto para habilitar a seleção de projeto na operação do motorista"}
            </p>
            {!search && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
            <DialogDescription>
              Projetos funcionam como centros de custo e aparecem na operação do
              motorista.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Obra BR-101"
                />
              </div>
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Ex: PRJ-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Cliente / contratante (opcional)"
              />
            </div>
            {units && units.length > 0 && (
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={form.unitId ? String(form.unitId) : "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, unitId: v === "none" ? null : Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem unidade</SelectItem>
                    {units.map((u: { id: number; name: string }) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descrição do projeto (opcional)"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Projeto ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Apenas projetos ativos aparecem na seleção do motorista.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Salvar" : "Criar"}
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
            <AlertDialogTitle>Desativar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto será desativado e deixará de aparecer na seleção do
              motorista. O histórico é preservado para auditoria.
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
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
