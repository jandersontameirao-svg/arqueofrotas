import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wrench,
  Car,
  Calendar,
  User,
  Building2,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Paperclip,
  FileText,
  ArrowLeft,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { LABELS } from "@shared/const";

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const serviceOrderId = parseInt(id || "0");

  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [executionNotes, setExecutionNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const { data: serviceOrder, isLoading, refetch } = trpc.serviceOrders.getById.useQuery(
    { id: serviceOrderId },
    { enabled: serviceOrderId > 0 }
  );

  const startMutation = trpc.serviceOrders.start.useMutation({
    onSuccess: () => {
      toast.success("Serviço iniciado");
      setIsStarting(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar serviço");
    },
  });

  const completeMutation = trpc.serviceOrders.complete.useMutation({
    onSuccess: () => {
      toast.success("Ordem de serviço concluída");
      setIsCompleting(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao concluir ordem de serviço");
    },
  });

  const cancelMutation = trpc.serviceOrders.cancel.useMutation({
    onSuccess: () => {
      toast.success("Ordem de serviço cancelada");
      setIsCanceling(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cancelar ordem de serviço");
    },
  });

  const handleStart = () => {
    startMutation.mutate({ id: serviceOrderId });
  };

  const handleComplete = () => {
    completeMutation.mutate({
      id: serviceOrderId,
      executionNotes: executionNotes || undefined,
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate({
      id: serviceOrderId,
      reason: cancelReason,
    });
  };

  const isGestor = user?.role === "admin" || user?.role === "gestor_frota";
  const isManutencao = user?.role === "manutencao" || isGestor;
  const canStart = isManutencao && serviceOrder?.status === "aberta";
  const canComplete = isManutencao && serviceOrder?.status === "em_andamento";
  const canCancel = isGestor && serviceOrder?.status !== "concluida" && serviceOrder?.status !== "cancelada";

  // Calculate total from items
  const totalItems = serviceOrder?.items?.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  ) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!serviceOrder) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ordem de Serviço não encontrada"
          description="A ordem de serviço solicitada não existe ou foi removida"
          icon={Wrench}
        />
        <Button variant="outline" asChild>
          <Link to="/service-orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para lista
          </Link>
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberta": return "bg-blue-100 text-blue-800";
      case "em_andamento": return "bg-amber-100 text-amber-800";
      case "concluida": return "bg-green-100 text-green-800";
      case "cancelada": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "aberta": return "Aberta";
      case "em_andamento": return "Em Andamento";
      case "concluida": return "Concluída";
      case "cancelada": return "Cancelada";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/service-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={`OS #${serviceOrder.id}`}
          description={`${serviceOrder.vehiclePlate} - ${serviceOrder.vehicleModel}`}
          icon={Wrench}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detalhes da Ordem de Serviço
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(serviceOrder.status)}`}>
                    {getStatusLabel(serviceOrder.status)}
                  </span>
                  <SeverityBadge severity={serviceOrder.priority} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo</p>
                    <p className="font-medium">{serviceOrder.vehiclePlate}</p>
                    <p className="text-sm text-muted-foreground">{serviceOrder.vehicleModel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Manutenção</p>
                    <p className="font-medium capitalize">{serviceOrder.maintenanceType}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Abertura</p>
                    <p className="font-medium">
                      {format(new Date(serviceOrder.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {serviceOrder.assignedToName && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Responsável</p>
                      <p className="font-medium">{serviceOrder.assignedToName}</p>
                    </div>
                  </div>
                )}

                {serviceOrder.kmAtOpen && (
                  <div className="flex items-start gap-3">
                    <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">KM na Abertura</p>
                      <p className="font-medium">{serviceOrder.kmAtOpen.toLocaleString()} km</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                <p className="whitespace-pre-wrap">{serviceOrder.description}</p>
              </div>

              {serviceOrder.executionNotes && (
                <div className="pt-4 border-t bg-muted/50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">Notas de Execução</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{serviceOrder.executionNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Info */}
          {(serviceOrder.supplierName || serviceOrder.supplierContact) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Fornecedor / Oficina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {serviceOrder.supplierName && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{serviceOrder.supplierName}</p>
                      </div>
                    </div>
                  )}
                  {serviceOrder.supplierContact && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Contato</p>
                        <p className="font-medium">{serviceOrder.supplierContact}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Itens do Serviço
                {serviceOrder.items && serviceOrder.items.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({serviceOrder.items.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceOrder.items && serviceOrder.items.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Descrição</th>
                          <th className="text-center py-2 font-medium w-20">Qtd</th>
                          <th className="text-right py-2 font-medium w-28">Valor Unit.</th>
                          <th className="text-right py-2 font-medium w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceOrder.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2">{item.description}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(Number(item.unitPrice) || 0)}
                            </td>
                            <td className="py-2 text-right font-medium">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalItems > 0 && (
                    <div className="flex justify-end pt-4 border-t">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(totalItems)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum item cadastrado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Anexos
                {serviceOrder.attachments && serviceOrder.attachments.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({serviceOrder.attachments.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceOrder.attachments && serviceOrder.attachments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {serviceOrder.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-lg overflow-hidden bg-muted border hover:border-primary transition-colors"
                    >
                      {attachment.fileType?.startsWith("image/") ? (
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName || "Anexo"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                          <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-xs text-center text-muted-foreground truncate max-w-full">
                            {attachment.fileName}
                          </p>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum anexo
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {(canStart || canComplete || canCancel) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Start Service */}
                {canStart && (
                  <Dialog open={isStarting} onOpenChange={setIsStarting}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Iniciar Serviço</DialogTitle>
                        <DialogDescription>
                          Confirma o início da execução desta ordem de serviço?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStarting(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleStart} disabled={startMutation.isPending}>
                          Confirmar Início
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Complete Service */}
                {canComplete && (
                  <Dialog open={isCompleting} onOpenChange={setIsCompleting}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Concluir Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Concluir Ordem de Serviço</DialogTitle>
                        <DialogDescription>
                          Descreva o que foi realizado nesta ordem de serviço.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Notas de Execução (opcional)</Label>
                          <Textarea
                            placeholder="Descreva os serviços realizados, peças trocadas, observações..."
                            value={executionNotes}
                            onChange={(e) => setExecutionNotes(e.target.value)}
                            className="min-h-[120px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleting(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                          Confirmar Conclusão
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Cancel Service */}
                {canCancel && (
                  <Dialog open={isCanceling} onOpenChange={setIsCanceling}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar OS
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancelar Ordem de Serviço</DialogTitle>
                        <DialogDescription>
                          Esta ação não pode ser desfeita. Informe o motivo do cancelamento.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Motivo do Cancelamento *</Label>
                          <Textarea
                            placeholder="Informe o motivo do cancelamento..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="min-h-[100px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCanceling(false)}>
                          Voltar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleCancel}
                          disabled={!cancelReason.trim() || cancelMutation.isPending}
                        >
                          Confirmar Cancelamento
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">OS Aberta</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(serviceOrder.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {serviceOrder.startedAt && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Serviço Iniciado</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(serviceOrder.startedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}

                {serviceOrder.completedAt && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Serviço Concluído</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(serviceOrder.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}

                {serviceOrder.status === "cancelada" && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">OS Cancelada</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono">#{serviceOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{format(new Date(serviceOrder.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em</span>
                <span>{format(new Date(serviceOrder.updatedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              {serviceOrder.occurrenceId && (
                <div className="pt-2 border-t">
                  <Link
                    to={`/occurrences/${serviceOrder.occurrenceId}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Ver Ocorrência #{serviceOrder.occurrenceId}
                  </Link>
                </div>
              )}
              {serviceOrder.maintenancePlanName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano</span>
                  <span>{serviceOrder.maintenancePlanName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
