import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isAdmin } from "@/lib/auth";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users, Save, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LABELS, USER_ROLES } from "@shared/const";

export function UserFormPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { user: currentUser } = useUser();
  const canManage = isAdmin(currentUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("motorista");
  const [unitId, setUnitId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);

  // Load existing user data for editing
  const { data: existingUser, isLoading: loadingUser } = trpc.users.getById.useQuery(
    { id: Number(id) },
    { enabled: isEditing }
  );

  // Load units for dropdown
  const { data: units } = trpc.units.list.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: (data) => {
      toast.success("Usuário criado com sucesso!");
      utils.users.list.invalidate();
      navigate(`/users/${data.id}`);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.users.list.invalidate();
      utils.users.getById.invalidate({ id: Number(id) });
      navigate(`/users/${id}`);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingUser) {
      setName(existingUser.name || "");
      setEmail(existingUser.email || "");
      setRole(existingUser.role || "motorista");
      setUnitId(existingUser.unitId ? String(existingUser.unitId) : "");
      setPhone(existingUser.phone || "");
      setActive(existingUser.active);
    }
  }, [existingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: Number(id),
        name: name.trim(),
        email: email.trim(),
        role: role as typeof USER_ROLES[number],
        unitId: unitId && unitId !== "none" ? Number(unitId) : null,
        phone: phone.trim() || undefined,
        active,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        role: role as typeof USER_ROLES[number],
        unitId: unitId && unitId !== "none" ? Number(unitId) : null,
        phone: phone.trim() || undefined,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Acesso negado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  if (isEditing && loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Usuários", href: "/users" },
          { label: isEditing ? "Editar Usuário" : "Novo Usuário" },
        ]}
      />

      <PageHeader
        title={isEditing ? "Editar Usuário" : "Novo Usuário"}
        description={isEditing ? "Atualize os dados do usuário" : "Cadastre um novo usuário no sistema"}
        icon={Users}
        backLink="/users"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Perfil de Acesso *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {LABELS.roles[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {units?.map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.id)}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEditing && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label htmlFor="active">Usuário Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Desativar impede o acesso ao sistema
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={active}
                    onCheckedChange={setActive}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? "Salvar Alterações" : "Criar Usuário"}
          </Button>
        </div>
      </form>
    </div>
  );
}
