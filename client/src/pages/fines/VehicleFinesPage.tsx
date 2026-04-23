import { useUser, isGestor } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Receipt, Plus, Search, Calendar, DollarSign, Eye, Pencil, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function VehicleFinesPage() {
  const { user } = useUser();
  const canEdit = isGestor(user);
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: fines, isLoading } = trpc.vehicleFines.listAll.useQuery();

  const utils = trpc.useUtils();

  const deleteMutation = trpc.vehicleFines.delete.useMutation({
    onSuccess: () => {
      toast.success("Multa excluída com sucesso");
      utils.vehicleFines.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir multa");
      setDeleteId(null);
    },
  });

  const filtered = fines?.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.vehiclePlate?.toLowerCase().includes(q) ||
      f.vehicleModel?.toLowerCase().includes(q) ||
      f.infraction?.toLowerCase().includes(q) ||
      f.autoInfracao?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case "paga": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paga</Badge>;
      case "recorrida": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Recorrida</Badge>;
      case "cancelada": return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Multas de Veículos"
          description="Registre e acompanhe multas de trânsito da frota"
          icon={Receipt}
        />
        {canEdit && (
          <Button asChild>
            <Link to="/fines/new">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Multa
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, modelo, infração..."
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
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((fine) => (
            <Card key={fine.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/fines/${fine.id}`)}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0 grid gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {fine.vehiclePlate || "Sem placa"} - {fine.vehicleModel || ""}
                    </span>
                    {getStatusBadge(fine.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {fine.fineDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(fine.fineDate), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                    {fine.driverName && (
                      <span className="flex items-center gap-1">
                        Motorista: {fine.driverName}
                      </span>
                    )}
                    {fine.amount && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(fine.amount)}
                      </span>
                    )}
                  </div>
                  {fine.infraction && (
                    <p className="text-sm text-muted-foreground truncate">{fine.infraction}</p>
                  )}
                </div>
                {fine.autoInfracao && (
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-xs text-muted-foreground">Auto Infração</p>
                    <p className="text-sm font-mono">{fine.autoInfracao}</p>
                  </div>
                )}
                {/* Menu de ações */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/fines/${fine.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => navigate(`/fines/${fine.id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(fine.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </>
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
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma multa registrada</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Tente ajustar sua busca" : "Registre a primeira multa de veículo"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta multa? Esta ação é irreversível e será registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
