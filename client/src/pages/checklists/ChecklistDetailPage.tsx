import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  MinusCircle,
  Car,
  User,
  Calendar,
  Gauge,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUser, isGestor } from "@/lib/auth";
import { toast } from "sonner";
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

const responseConfig = {
  ok: {
    label: "OK",
    icon: CheckCircle,
    className: "text-green-600",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  nao_ok: {
    label: "Não OK",
    icon: XCircle,
    className: "text-red-600",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  na: {
    label: "N/A",
    icon: MinusCircle,
    className: "text-gray-500",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

export function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const canManage = isGestor(user);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.checklists.delete.useMutation({
    onSuccess: () => {
      toast.success("Checklist excluído com sucesso");
      utils.checklists.list.invalidate();
      navigate("/checklists");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir checklist");
    },
  });

  const { data: checklist, isLoading } = trpc.checklists.getById.useQuery(
    { id: Number(id) },
    { enabled: Boolean(id) }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Checklist não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/checklists")}>
          Voltar para Checklists
        </Button>
      </div>
    );
  }

  const okCount = checklist.responses.filter((r) => r.response === "ok").length;
  const naoOkCount = checklist.responses.filter((r) => r.response === "nao_ok").length;
  const naCount = checklist.responses.filter((r) => r.response === "na").length;

  // Group responses by category
  const grouped = checklist.responses.reduce<Record<string, typeof checklist.responses>>(
    (acc, r) => {
      const cat = r.itemCategory ?? "Geral";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Breadcrumb
        items={[
          { label: "Checklists", href: "/checklists" },
          { label: `Checklist #${checklist.id}` },
        ]}
      />

      <PageHeader
        title={`Checklist #${checklist.id}`}
        description={checklist.templateName}
        icon={ClipboardCheck}
        backLink="/checklists"
        actions={
          <div className="flex items-center gap-2">
            {checklist.hasIssues ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Com Pendências
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
                <CheckCircle className="h-3 w-3" />
                Aprovado
              </Badge>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
            <Car className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Veículo</p>
            <p className="font-mono font-semibold text-sm">{checklist.vehiclePlate}</p>
            <p className="text-xs text-muted-foreground">{checklist.vehicleModel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
            <User className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Executado por</p>
            <p className="font-semibold text-sm text-center">{checklist.userName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-semibold text-sm">
              {format(new Date(checklist.executedAt), "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(checklist.executedAt), "HH:mm", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">KM</p>
            <p className="font-semibold text-sm">
              {checklist.km ? checklist.km.toLocaleString("pt-BR") : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-3xl font-bold text-green-600">{okCount}</p>
              <p className="text-xs text-muted-foreground">OK</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-red-600">{naoOkCount}</p>
              <p className="text-xs text-muted-foreground">Não OK</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-500">{naCount}</p>
              <p className="text-xs text-muted-foreground">N/A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base">{category}</CardTitle>
            <CardDescription>{items.length} itens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => {
              const config = responseConfig[item.response as keyof typeof responseConfig];
              const Icon = config?.icon ?? MinusCircle;
              return (
                <div key={item.id}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config?.className)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{item.itemDescription}</p>
                        {item.isCritical && (
                          <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
                            Crítico
                          </Badge>
                        )}
                        <Badge className={cn("text-xs", config?.badgeClass)}>
                          {config?.label}
                        </Badge>
                      </div>
                      {item.comment && (
                        <p className="text-xs text-muted-foreground mt-1">{item.comment}</p>
                      )}
                      {item.photoUrl && (
                        <img
                          src={item.photoUrl}
                          alt="Evidência"
                          className="mt-2 h-32 w-auto rounded-lg border object-contain"
                        />
                      )}
                      {item.occurrenceId && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs mt-1"
                          onClick={() => navigate(`/occurrences/${item.occurrenceId}`)}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Ver ocorrência gerada
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Observations */}
      {checklist.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{checklist.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Checklist #{checklist.id}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este checklist? O registro será removido da listagem e esta ação não pode ser desfeita. Um log de auditoria será gerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate({ id: checklist.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir Checklist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
