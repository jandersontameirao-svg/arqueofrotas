import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isAdmin } from "@/lib/auth";
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
import { Users, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { LABELS, USER_ROLES } from "@shared/const";

type User = {
  id: number;
  name: string;
  email: string | null;
  role: string;
  unitName: string | null;
  active: boolean;
  createdAt: Date;
};

export function UsersPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canManage = isAdmin(user);

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const { data: allUsers, isLoading } = trpc.users.list.useQuery();
  
  // Filter users by role client-side
  const users = allUsers?.filter(u => 
    roleFilter === "all" || u.role === roleFilter
  );

  const utils = trpc.useUtils();

  const deactivateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário desativado com sucesso!");
      utils.users.list.invalidate();
      setDeleteUserId(null);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Erro ao desativar usuário");
    },
  });

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Nome",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {row.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            {row.email && <p className="text-xs text-muted-foreground">{row.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Perfil",
      sortable: true,
      cell: (row) => {
        const roleColors: Record<string, string> = {
          admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          gestor_frota: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
          motorista: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          manutencao: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
        return (
          <Badge variant="outline" className={roleColors[row.role] ?? ""}>
            {LABELS.roles[row.role as keyof typeof LABELS.roles]}
          </Badge>
        );
      },
    },
    {
      key: "unitName",
      header: "Unidade",
      sortable: true,
      cell: (row) => row.unitName ?? "-",
    },
    {
      key: "active",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.active ? "secondary" : "outline"}>
          {row.active ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      sortable: true,
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy", { locale: ptBR }),
    },
  ];

  const actions: Action<User>[] = [
    {
      label: "Ver Detalhes",
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => navigate(`/users/${row.id}`),
    },
    {
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/users/${row.id}/edit`),
      hidden: () => !canManage,
    },
    {
      label: "Remover",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (row) => setDeleteUserId(row.id),
      variant: "destructive",
      hidden: (row) => !canManage || row.id === user?.id,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários do sistema"
        icon={Users}
        actions={
          canManage && (
            <Button onClick={() => navigate("/users/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          )
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Perfis</SelectItem>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {LABELS.roles[role]}
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
        data={(users ?? []) as User[]}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por nome ou email..."
        searchKeys={["name", "email"]}
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        emptyMessage="Nenhum usuário encontrado"
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deactivateMutation.mutate({ id: deleteUserId, active: false })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
