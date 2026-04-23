import { useLocation, useParams } from "wouter";
import { useState, useRef } from "react";
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
} from "@/components/ui/dialog";
import { DOCUMENT_TYPES } from "@shared/const";
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
  Gauge,
  User,
  Building2,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS } from "@shared/const";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

const PHOTO_TYPES = [
  { key: "frente", label: "Frente" },
  { key: "traseira", label: "Traseira" },
  { key: "lateral_esquerda", label: "Lateral Esquerda" },
  { key: "lateral_direita", label: "Lateral Direita" },
  { key: "interior", label: "Interior" },
] as const;

type PhotoType = typeof PHOTO_TYPES[number]["key"];

export function VehicleDetailPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const canEdit = isGestor(user);
  
  const [uploadingPhoto, setUploadingPhoto] = useState<PhotoType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<PhotoType | null>(null);

  // Document modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState<string>("crlv");
  const [docDescription, setDocDescription] = useState("");
  const [docExpiration, setDocExpiration] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const { data: vehicle, isLoading } = trpc.vehicles.getById.useQuery(
    { id: Number(id) },
    { enabled: Boolean(id) }
  );

  const { data: documents, refetch: refetchDocuments } = trpc.vehicleDocuments.listByVehicle.useQuery(
    { vehicleId: Number(id) },
    { enabled: Boolean(id) }
  );

  const utils = trpc.useUtils();

  const createDocMutation = trpc.vehicleDocuments.create.useMutation({
    onSuccess: () => {
      toast.success("Documento adicionado com sucesso!");
      refetchDocuments();
      setShowDocModal(false);
      setDocType("crlv");
      setDocDescription("");
      setDocExpiration("");
      setDocFile(null);
    },
    onError: (error) => {
      toast.error("Erro ao adicionar documento", { description: error.message });
    },
  });

  const deleteDocMutation = trpc.vehicleDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento removido com sucesso!");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error("Erro ao remover documento", { description: error.message });
    },
  });

  const handleAddDocument = async () => {
    let fileData: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;

    if (docFile) {
      const buffer = await docFile.arrayBuffer();
      fileData = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      fileName = docFile.name;
      fileType = docFile.type;
    }

    createDocMutation.mutate({
      vehicleId: Number(id),
      documentType: docType as typeof DOCUMENT_TYPES[number],
      description: docDescription || undefined,
      expirationDate: docExpiration ? new Date(docExpiration) : undefined,
      fileData,
      fileName,
      fileType,
    });
  };

  const { data: timeline } = trpc.dashboard.getVehicleTimeline.useQuery(
    { vehicleId: Number(id), limit: 20 },
    { enabled: Boolean(id) }
  );

  const { data: photos, refetch: refetchPhotos } = trpc.vehiclePhotos.listByVehicle.useQuery(
    { vehicleId: Number(id) },
    { enabled: Boolean(id) }
  );

  const uploadMutation = trpc.vehiclePhotos.upsert.useMutation({
    onSuccess: () => {
      toast.success("Foto enviada com sucesso!");
      refetchPhotos();
      setUploadingPhoto(null);
    },
    onError: (error) => {
      toast.error("Erro ao enviar foto", { description: error.message });
      setUploadingPhoto(null);
    },
  });

  const deleteMutation = trpc.vehiclePhotos.delete.useMutation({
    onSuccess: () => {
      toast.success("Foto removida com sucesso!");
      refetchPhotos();
    },
    onError: (error) => {
      toast.error("Erro ao remover foto", { description: error.message });
    },
  });

  const handlePhotoUpload = async (photoType: PhotoType) => {
    setSelectedPhotoType(photoType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPhotoType) return;

    setUploadingPhoto(selectedPhotoType);

    try {
      // Converter para base64 e fazer upload via S3
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Falha no upload");
      }

      const { url } = await response.json();

      await uploadMutation.mutateAsync({
        vehicleId: Number(id),
        photoType: selectedPhotoType,
        photoUrl: url,
      });
    } catch (error) {
      toast.error("Erro ao enviar foto");
      setUploadingPhoto(null);
    }

    // Limpar input
    e.target.value = "";
    setSelectedPhotoType(null);
  };

  const getPhotoByType = (type: PhotoType) => {
    return photos?.find((p) => p.photoType === type);
  };

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
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

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
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-2" />
            Fotos ({photos?.length ?? 0}/5)
          </TabsTrigger>
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

        {/* Nova aba de Fotos */}
        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos do Status Atual do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Registre fotos do veículo para documentar seu estado atual. Essas fotos servem como referência para comparação em checklists e ocorrências.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {PHOTO_TYPES.map(({ key, label }) => {
                  const photo = getPhotoByType(key);
                  const isUploading = uploadingPhoto === key;

                  return (
                    <div key={key} className="relative">
                      <p className="text-sm font-medium mb-2 text-center">{label}</p>
                      <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden bg-muted/50 relative">
                        {photo ? (
                          <>
                            <img
                              src={photo.photoUrl}
                              alt={label}
                              className="w-full h-full object-cover"
                            />
                            {canEdit && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handlePhotoUpload(key)}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate({ id: photo.id })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => canEdit && handlePhotoUpload(key)}
                            disabled={!canEdit || isUploading}
                            className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 className="h-8 w-8 animate-spin" />
                            ) : (
                              <>
                                <ImageIcon className="h-8 w-8 mb-2" />
                                <span className="text-xs">
                                  {canEdit ? "Clique para adicionar" : "Sem foto"}
                                </span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documentos</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setShowDocModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
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
                        <div className="flex items-center gap-3">
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
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja remover este documento?")) {
                                  deleteDocMutation.mutate({ id: doc.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

          {/* Modal para adicionar documento */}
          <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
                <DialogDescription>
                  Cadastre um novo documento para o veículo {vehicle?.plate}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento *</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((dt) => (
                        <SelectItem key={dt} value={dt}>
                          {LABELS.documentTypes[dt as keyof typeof LABELS.documentTypes]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    placeholder="Descrição do documento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={docExpiration}
                    onChange={(e) => setDocExpiration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo (PDF, imagem)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDocModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddDocument}
                  disabled={createDocMutation.isPending}
                >
                  {createDocMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  {timeline.map((item) => (
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
