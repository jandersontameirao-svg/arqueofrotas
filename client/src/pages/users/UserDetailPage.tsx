import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isAdmin } from "@/lib/auth";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Users, Edit, Trash2, Loader2, Mail, Phone, Building2, Shield, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { LABELS } from "@shared/const";
import { useState } from "react";

export function UserDetailPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useUser();
  const canManage = isAdmin(currentUser);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: userData, isLoading } = trpc.users.getById.useQuery(
    { id: Number(id) },
    { enabled: Boolean(id) }
  );

  const utils = trpc.useUtils();

  const deactivateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário desativado com sucesso!");
      utils.users.list.invalidate();
      navigate("/users");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Erro ao desativar usuário");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Usuário não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/users")}>
          Voltar para Usuários
        </Button>
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    gestor_frota: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    motorista: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    manutencao: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Usuários", href: "/users" },
          { label: userData.name || "Detalhes" },
        ]}
      />

      <PageHeader
        title={userData.name || "Usuário"}
        description={`Detalhes do usuário`}
        icon={Users}
        backLink="/users"
        actions={
          canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/users/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              {currentUser?.id !== userData.id && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              )}
            </div>
          )
        }
      />

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perfil</p>
                <Badge variant="outline" className={roleColors[userData.role] ?? ""}>
                  {LABELS.roles[userData.role as keyof typeof LABELS.roles]}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unidade</p>
                <p className="text-lg font-semibold">{userData.unitName ?? "Não definida"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${userData.active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Users className={`h-5 w-5 ${userData.active ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={userData.active ? "secondary" : "outline"}>
                  {userData.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Último Acesso</p>
                <p className="text-sm font-semibold">
                  {userData.lastSignedIn
                    ? format(new Date(userData.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "Nunca"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{userData.email || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{userData.phone || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">ID do Usuário</p>
              <p className="font-mono font-medium">{userData.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">OpenID</p>
              <p className="font-mono text-sm">{userData.openId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cadastrado em</p>
              <p className="font-medium">
                {format(new Date(userData.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última Atualização</p>
              <p className="font-medium">
                {format(new Date(userData.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o usuário <strong>{userData.name}</strong>?
              O usuário não poderá mais acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deactivateMutation.mutate({ id: Number(id), active: false });
                setShowDeleteDialog(false);
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
