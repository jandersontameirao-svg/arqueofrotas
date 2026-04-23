import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
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
  AlertTriangle,
  Car,
  Calendar,
  MapPin,
  User,
  MessageSquare,
  Paperclip,
  Clock,
  CheckCircle,
  XCircle,
  Wrench,
  Send,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { LABELS } from "@shared/const";

export function OccurrenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const occurrenceId = parseInt(id || "0");

  const [newComment, setNewComment] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closureNotes, setClosureNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: occurrence, isLoading, refetch } = trpc.occurrences.getById.useQuery(
    { id: occurrenceId },
    { enabled: occurrenceId > 0 }
  );

  const utils = trpc.useUtils();

  const deleteOccurrenceMutation = trpc.occurrences.delete.useMutation({
    onSuccess: () => {
      toast.success("Ocorrência excluída com sucesso");
      utils.occurrences.list.invalidate();
      navigate("/occurrences");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir ocorrência");
    },
  });

  const addCommentMutation = trpc.occurrences.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado");
      setNewComment("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar comentário");
    },
  });

  const updateStatusMutation = trpc.occurrences.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const closeMutation = trpc.occurrences.close.useMutation({
    onSuccess: () => {
      toast.success("Ocorrência encerrada");
      setIsClosing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao encerrar ocorrência");
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({
      occurrenceId,
      comment: newComment,
    });
  };

  const handleUpdateStatus = (status: string) => {
    updateStatusMutation.mutate({
      id: occurrenceId,
      status: status as "aberto" | "em_tratamento" | "encerrado",
    });
  };

  const handleClose = () => {
    closeMutation.mutate({
      id: occurrenceId,
      closureNotes,
    });
  };

  const isGestor = user?.role === "admin" || user?.role === "gestor_frota";
  const canClose = isGestor && occurrence?.status !== "encerrado";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!occurrence) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ocorrência não encontrada"
          description="A ocorrência solicitada não existe ou foi removida"
          icon={AlertTriangle}
        />
        <Button variant="outline" asChild>
          <Link to="/occurrences">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para lista
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/occurrences">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={`Ocorrência #${occurrence.id}`}
          description={`${occurrence.vehiclePlate} - ${occurrence.vehicleModel}`}
          icon={AlertTriangle}
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
                  Detalhes da Ocorrência
                </CardTitle>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={occurrence.severity} />
                  <StatusBadge status={occurrence.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo</p>
                    <p className="font-medium">{occurrence.vehiclePlate}</p>
                    <p className="text-sm text-muted-foreground">{occurrence.vehicleModel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reportado por</p>
                    <p className="font-medium">{occurrence.reportedByName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Ocorrência</p>
                    <p className="font-medium">
                      {format(new Date(occurrence.occurredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {occurrence.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Local</p>
                      <p className="font-medium">{occurrence.location}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Descrição</p>
                <p className="whitespace-pre-wrap">{occurrence.description}</p>
              </div>

              {occurrence.status === "encerrado" && occurrence.closureNotes && (
                <div className="pt-4 border-t bg-muted/50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">Encerrado em {occurrence.closedAt ? format(new Date(occurrence.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ""}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{occurrence.closureNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Anexos
                {occurrence.attachments && occurrence.attachments.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({occurrence.attachments.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {occurrence.attachments && occurrence.attachments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {occurrence.attachments.map((attachment) => (
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
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm">Abrir</span>
                      </div>
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

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentários
                {occurrence.comments && occurrence.comments.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({occurrence.comments.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {occurrence.comments && occurrence.comments.length > 0 ? (
                <div className="space-y-4">
                  {occurrence.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {comment.userName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{comment.userName}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum comentário ainda
                </p>
              )}

              {/* Add Comment */}
              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {isGestor && occurrence.status !== "encerrado" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Update Status */}
                <div className="space-y-2">
                  <Label>Alterar Status</Label>
                  <Select
                    value={occurrence.status}
                    onValueChange={handleUpdateStatus}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_tratamento">Em Tratamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Link to Service Order */}
                {!occurrence.serviceOrderId && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/service-orders/new?occurrenceId=${occurrence.id}&vehicleId=${occurrence.vehicleId}`}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Criar Ordem de Serviço
                    </Link>
                  </Button>
                )}

                {occurrence.serviceOrderId && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/service-orders/${occurrence.serviceOrderId}`}>
                      <Wrench className="h-4 w-4 mr-2" />
                      Ver Ordem de Serviço
                    </Link>
                  </Button>
                )}

                {/* Close Occurrence */}
                <Dialog open={isClosing} onOpenChange={setIsClosing}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Encerrar Ocorrência
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Encerrar Ocorrência</DialogTitle>
                      <DialogDescription>
                        Descreva as ações tomadas para resolver esta ocorrência.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Notas de Encerramento</Label>
                        <Textarea
                          placeholder="Descreva como a ocorrência foi resolvida..."
                          value={closureNotes}
                          onChange={(e) => setClosureNotes(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsClosing(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleClose}
                        disabled={!closureNotes.trim() || closeMutation.isPending}
                      >
                        Confirmar Encerramento
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Excluir Ocorrência */}
          {isGestor && (
            <Card className="border-destructive/30">
              <CardContent className="pt-4">
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Ocorrência
                </Button>
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
                  <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Ocorrência registrada</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(occurrence.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">por {occurrence.reportedByName}</p>
                  </div>
                </div>

                {occurrence.status === "em_tratamento" && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Em tratamento</p>
                      <p className="text-xs text-muted-foreground">
                        Status atualizado
                      </p>
                    </div>
                  </div>
                )}

                {occurrence.status === "encerrado" && occurrence.closedAt && (
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Ocorrência encerrada</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(occurrence.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
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
                <span className="font-mono">#{occurrence.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{format(new Date(occurrence.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em</span>
                <span>{format(new Date(occurrence.updatedAt), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              {occurrence.checklistResponseId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origem</span>
                  <span>Checklist</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ocorrência #{occurrence?.id}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ocorrência? O registro será removido da listagem e esta ação não pode ser desfeita. Um log de auditoria será gerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => occurrence && deleteOccurrenceMutation.mutate({ id: occurrence.id })}
              disabled={deleteOccurrenceMutation.isPending}
            >
              {deleteOccurrenceMutation.isPending ? "Excluindo..." : "Excluir Ocorrência"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
