import { useUser, isGestor } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Receipt, ArrowLeft, Pencil, Trash2, Loader2, Car, Calendar, DollarSign, MapPin, User, FileText, Hash } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { LABELS } from "@shared/const";

export function VehicleFineDetailPage() {
  const { user } = useUser();
  const canEdit = isGestor(user);
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const fineId = Number(params.id);

  const { data: fine, isLoading } = trpc.vehicleFines.getById.useQuery({ id: fineId });

  const { data: vehiclesList } = trpc.vehicles.list.useQuery();
  const { data: usersList } = trpc.users.list.useQuery();

  const utils = trpc.useUtils();

  const deleteMutation = trpc.vehicleFines.delete.useMutation({
    onSuccess: () => {
      toast.success("Multa excluída com sucesso");
      utils.vehicleFines.invalidate();
      navigate("/fines");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir multa");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fine) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/fines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title="Multa não encontrada" description="A multa solicitada não existe" icon={Receipt} />
        </div>
      </div>
    );
  }

  const vehicle = vehiclesList?.find((v) => v.id === fine.vehicleId);
  const driver = usersList?.find((u) => u.id === fine.responsibleDriverId);
  const registeredBy = usersList?.find((u) => u.id === fine.registeredById);

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

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/fines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title={`Multa #${fine.id}`}
            description={fine.infraction}
            icon={Receipt}
          />
          {getStatusBadge(fine.status)}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={`/fines/${fine.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta multa? A multa será marcada como cancelada e não poderá ser revertida facilmente. Esta ação será registrada na auditoria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate({ id: fine.id })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados Principais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Dados da Infração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Infração</p>
                  <p className="font-medium">{fine.infraction}</p>
                </div>
              </div>
              {fine.autoInfracao && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Auto de Infração</p>
                    <p className="font-mono">{fine.autoInfracao}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data da Multa</p>
                  <p>{formatDate(fine.fineDate)}</p>
                </div>
              </div>
              {fine.dueDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p>{formatDate(fine.dueDate)}</p>
                  </div>
                </div>
              )}
              {fine.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p>{fine.location}</p>
                  </div>
                </div>
              )}
              {fine.points != null && fine.points > 0 && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pontos na CNH</p>
                    <p>{fine.points} pontos</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Valores e Veículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valores e Vínculos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor da Multa</p>
                  <p className="font-medium text-lg">{formatCurrency(fine.amount)}</p>
                </div>
              </div>
              {fine.discountAmount && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor com Desconto</p>
                    <p className="text-green-600">{formatCurrency(fine.discountAmount)}</p>
                  </div>
                </div>
              )}
              {fine.paidAmount && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Pago</p>
                    <p>{formatCurrency(fine.paidAmount)}</p>
                  </div>
                </div>
              )}
              {fine.paidAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data do Pagamento</p>
                    <p>{formatDate(fine.paidAt)}</p>
                  </div>
                </div>
              )}
              <div className="border-t pt-3 mt-2">
                <div className="flex items-start gap-3">
                  <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo</p>
                    <p>{vehicle ? `${vehicle.plate} - ${vehicle.model}` : `ID ${fine.vehicleId}`}</p>
                  </div>
                </div>
              </div>
              {driver && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Motorista Responsável</p>
                    <p>{driver.name}</p>
                  </div>
                </div>
              )}
              {registeredBy && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Registrado por</p>
                    <p>{registeredBy.name}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observações */}
      {fine.observations && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{fine.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadados */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Criado em: {formatDate(fine.createdAt)}</span>
            <span>Atualizado em: {formatDate(fine.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
