import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser, isGestor } from "@/lib/auth";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Edit,
  FileText,
  Wrench,
  Calendar,
  AlertTriangle,
  ClipboardCheck,
  Loader2,
  MapPin,
  Gauge,
  User,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS } from "@shared/const";

export function VehicleDetailPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const canEdit = isGestor(user);

  const { data: vehicle, isLoading } = trpc.vehicles.getById.useQuery(
    { id: Number(id) },
    { enabled: Boolean(id) }
  );

  const { data: documents } = trpc.vehicleDocuments.listByVehicle.useQuery(
    { vehicleId: Number(id) },
    { enabled: Boolean(id) }
  );

  const { data: timeline } = trpc.dashboard.getVehicleTimeline.useQuery(
    { vehicleId: Number(id), limit: 20 },
    { enabled: Boolean(id) }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Veículo não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/vehicles")}>
          Voltar para Veículos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Veículos", href: "/vehicles" },
          { label: vehicle.plate },
        ]}
      />

      <PageHeader
        title={vehicle.plate}
        description={`${vehicle.brand ?? ""} ${vehicle.model} ${vehicle.year}`}
        icon={Car}
        backLink="/vehicles"
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/vehicles/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button onClick={() => navigate(`/service-orders/new?vehicleId=${id}`)}>
                <Wrench className="h-4 w-4 mr-2" />
                Abrir OS
              </Button>
            </div>
          )
        }
      />

      {/* Status Card */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={vehicle.status} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Gauge className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Km Atual</p>
                <p className="text-lg font-semibold">
                  {vehicle.currentKm?.toLocaleString("pt-BR") ?? "-"} km
                </p>
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
                <p className="text-lg font-semibold">{vehicle.unitName ?? "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Responsável</p>
                <p className="text-lg font-semibold">{(vehicle as { currentResponsibleName?: string | null }).currentResponsibleName ?? "Disponível"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="documents">
            Documentos ({documents?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="timeline">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Veículo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Placa</p>
                    <p className="font-mono font-medium">{vehicle.plate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">
                      {LABELS.vehicleTypes[vehicle.vehicleType as keyof typeof LABELS.vehicleTypes]}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Marca</p>
                    <p className="font-medium">{vehicle.brand ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo</p>
                    <p className="font-medium">{vehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ano</p>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cor</p>
                    <p className="font-medium">{vehicle.color ?? "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Chassi</p>
                    <p className="font-mono font-medium">{vehicle.chassi ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Renavam</p>
                    <p className="font-mono font-medium">{vehicle.renavam ?? "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {vehicle.observations && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{vehicle.observations}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documentos</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => navigate(`/vehicles/${id}/documents/new`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
                    const isExpiring =
                      doc.expirationDate &&
                      !isExpired &&
                      new Date(doc.expirationDate) <
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isExpired
                            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                            : isExpiring
                            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {LABELS.documentTypes[doc.documentType as keyof typeof LABELS.documentTypes]}
                            </p>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {doc.expirationDate ? (
                            <p
                              className={`text-sm ${
                                isExpired
                                  ? "text-red-600 font-medium"
                                  : isExpiring
                                  ? "text-yellow-600 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isExpired ? "Vencido em " : isExpiring ? "Vence em " : "Válido até "}
                              {format(new Date(doc.expirationDate), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sem vencimento</p>
                          )}
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              Ver arquivo
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum documento cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline && timeline.length > 0 ? (
                <div className="relative space-y-0">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  {timeline.map((item, index) => (
                    <div key={`${item.type}-${item.id}`} className="relative pl-10 pb-6 last:pb-0">
                      <div
                        className={`absolute left-2 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center ${
                          item.type === "occurrence"
                            ? "border-red-500"
                            : item.type === "service_order"
                            ? "border-yellow-500"
                            : item.type === "checklist"
                            ? "border-green-500"
                            : "border-blue-500"
                        }`}
                      >
                        {item.type === "occurrence" && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        {item.type === "service_order" && <Wrench className="h-3 w-3 text-yellow-500" />}
                        {item.type === "checklist" && <ClipboardCheck className="h-3 w-3 text-green-500" />}
                        {item.type === "reservation" && <Calendar className="h-3 w-3 text-blue-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {item.type === "occurrence" && "Ocorrência"}
                          {item.type === "service_order" && "Ordem de Serviço"}
                          {item.type === "checklist" && "Checklist"}
                          {item.type === "reservation" && "Reserva"}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
