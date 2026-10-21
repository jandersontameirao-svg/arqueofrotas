import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Loader2,
  Camera,
  X,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChecklistResponse = {
  templateItemId: number;
  response: "ok" | "nao_ok" | "na";
  comment?: string;
  photoData?: string;
  photoFileName?: string;
};

export function ChecklistExecutePage() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedVehicleId = searchParams.get("vehicleId");
  const preselectedReservationId = searchParams.get("reservationId");

  const [commandId] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState<"select" | "execute" | "review">("select");
  const [vehicleId, setVehicleId] = useState<number>(
    preselectedVehicleId ? Number(preselectedVehicleId) : 0
  );
  const [templateId, setTemplateId] = useState<number>(0);
  const [km, setKm] = useState<string>("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, ChecklistResponse>>(
    new Map()
  );
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [observations, setObservations] = useState("");

  const { data: vehicles } = trpc.vehicles.list.useQuery({});
  const { data: templates } = trpc.checklistTemplates.listActive.useQuery();
  const { data: templateData } = trpc.checklistTemplates.getById.useQuery(
    { id: templateId },
    { enabled: templateId > 0 }
  );
  const templateItems = templateData?.items ?? [];

  const utils = trpc.useUtils();

  const submitMutation = trpc.checklists.submit.useMutation({
    onSuccess: (data: { id: number }) => {
      toast.success("Checklist executado com sucesso!");
      utils.checklists.list.invalidate();
      navigate(`/checklists/${data.id}`);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Erro ao executar checklist");
    },
  });

  const selectedVehicle = vehicles?.find(v => v.id === vehicleId);
  const selectedTemplate = templates?.find(t => t.id === templateId);
  const items = templateItems;
  const currentItem = items[currentItemIndex];

  const progress = items.length > 0 ? (responses.size / items.length) * 100 : 0;
  const hasIssues = Array.from(responses.values()).some(
    r => r.response === "nao_ok"
  );

  const handleResponse = (response: "ok" | "nao_ok" | "na") => {
    if (!currentItem) return;

    setResponses(prev => {
      const newMap = new Map(prev);
      newMap.set(currentItem.id, {
        templateItemId: currentItem.id,
        response,
        comment: prev.get(currentItem.id)?.comment,
        photoData: currentPhoto ?? prev.get(currentItem.id)?.photoData,
        photoFileName: prev.get(currentItem.id)?.photoFileName ?? "foto.jpg",
      });
      return newMap;
    });

    // Auto-advance to next item
    if (response !== "nao_ok" && currentItemIndex < items.length - 1) {
      setTimeout(() => {
        setCurrentItemIndex(prev => prev + 1);
        setCurrentPhoto(null);
      }, 300);
    }
  };

  const handleObservation = (comment: string) => {
    if (!currentItem) return;

    setResponses(prev => {
      const newMap = new Map(prev);
      const existing = prev.get(currentItem.id);
      if (existing) {
        newMap.set(currentItem.id, { ...existing, comment });
      }
      return newMap;
    });
  };

  const handlePhotoCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          const data = e.target?.result as string;
          setCurrentPhoto(data);
          if (currentItem)
            setResponses(prev => {
              const existing = prev.get(currentItem.id);
              if (!existing) return prev;
              const updated = new Map(prev);
              updated.set(currentItem.id, {
                ...existing,
                photoData: data,
                photoFileName: file.name,
              });
              return updated;
            });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = () => {
    if (!vehicleId || !templateId) {
      toast.error("Selecione o veículo e o template");
      return;
    }

    if (responses.size < items.length) {
      toast.error("Responda todos os itens do checklist");
      return;
    }

    submitMutation.mutate({
      idempotencyKey: commandId,
      requestId: commandId,
      vehicleId,
      templateId,
      km: km ? Number(km) : undefined,
      observations: observations || undefined,
      responses: Array.from(responses.values()),
    });
  };

  // Selection step
  if (step === "select") {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <Breadcrumb
          items={[
            { label: "Checklists", href: "/checklists" },
            { label: "Novo Checklist" },
          ]}
        />

        <PageHeader
          title="Novo Checklist"
          description="Selecione o veículo e o tipo de checklist"
          icon={ClipboardCheck}
          backLink="/checklists"
        />

        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Veículo *</Label>
              <Select
                value={vehicleId?.toString() ?? ""}
                onValueChange={v => setVehicleId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.plate} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template de Checklist *</Label>
              <Select
                value={templateId?.toString() ?? ""}
                onValueChange={v => setTemplateId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map(template => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quilometragem Atual</Label>
              <Input
                type="number"
                value={km}
                onChange={e => setKm(e.target.value)}
                placeholder="Ex: 45000"
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!vehicleId || !templateId}
              onClick={() => setStep("execute")}
            >
              Iniciar Checklist
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Execute step
  if (step === "execute") {
    return (
      <div className="space-y-4 max-w-lg mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 pb-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentItemIndex + 1} / {items.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2 mt-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {selectedVehicle?.plate} - {selectedTemplate?.name}
            </span>
          </div>
        </div>

        {/* Current Item */}
        {currentItem && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentItem.description}
              </CardTitle>
              {currentItem.category && (
                <CardDescription>{currentItem.category}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Response buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "flex-col h-20 gap-1",
                    responses.get(currentItem.id)?.response === "ok" &&
                      "border-green-500 bg-green-50 dark:bg-green-950/30"
                  )}
                  onClick={() => handleResponse("ok")}
                >
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-xs">OK</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "flex-col h-20 gap-1",
                    responses.get(currentItem.id)?.response === "nao_ok" &&
                      "border-red-500 bg-red-50 dark:bg-red-950/30"
                  )}
                  onClick={() => handleResponse("nao_ok")}
                >
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="text-xs">Não OK</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "flex-col h-20 gap-1",
                    responses.get(currentItem.id)?.response === "na" &&
                      "border-gray-500 bg-gray-50 dark:bg-gray-950/30"
                  )}
                  onClick={() => handleResponse("na")}
                >
                  <MinusCircle className="h-6 w-6 text-gray-600" />
                  <span className="text-xs">N/A</span>
                </Button>
              </div>

              {/* Photo capture */}
              {(currentItem.isCritical ||
                responses.get(currentItem.id)?.response === "nao_ok") && (
                <div className="space-y-2">
                  <Label>Foto (obrigatória para Não OK)</Label>
                  {currentPhoto ? (
                    <div className="relative">
                      <img
                        src={currentPhoto}
                        alt="Foto capturada"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setCurrentPhoto(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-24"
                      onClick={handlePhotoCapture}
                    >
                      <Camera className="h-6 w-6 mr-2" />
                      Tirar Foto
                    </Button>
                  )}
                </div>
              )}

              {/* Observation */}
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={responses.get(currentItem.id)?.comment ?? ""}
                  onChange={e => handleObservation(e.target.value)}
                  placeholder="Adicione uma observação se necessário..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="max-w-lg mx-auto flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={currentItemIndex === 0}
              onClick={() => setCurrentItemIndex(prev => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            {currentItemIndex < items.length - 1 ? (
              <Button
                className="flex-1"
                disabled={!responses.has(currentItem?.id ?? 0)}
                onClick={() => setCurrentItemIndex(prev => prev + 1)}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                disabled={responses.size < items.length}
                onClick={() => setStep("review")}
              >
                Revisar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Review step
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <PageHeader
        title="Revisar Checklist"
        description="Confira as respostas antes de enviar"
        icon={ClipboardCheck}
      />

      {/* Summary */}
      <Card className={hasIssues ? "border-yellow-500" : "border-green-500"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasIssues ? (
              <>
                <XCircle className="h-5 w-5 text-yellow-600" />
                Checklist com Pendências
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Checklist OK
              </>
            )}
          </CardTitle>
          <CardDescription>
            {selectedVehicle?.plate} - {selectedTemplate?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {
                  Array.from(responses.values()).filter(
                    r => r.response === "ok"
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">OK</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {
                  Array.from(responses.values()).filter(
                    r => r.response === "nao_ok"
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">Não OK</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">
                {
                  Array.from(responses.values()).filter(
                    r => r.response === "na"
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">N/A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items with issues */}
      {hasIssues && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens com Problemas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items
              .filter(
                (item: { id: number; description: string }) =>
                  responses.get(item.id)?.response === "nao_ok"
              )
              .map((item: { id: number; description: string }) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200"
                >
                  <p className="font-medium text-sm">{item.description}</p>
                  {responses.get(item.id)?.comment && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {responses.get(item.id)?.comment}
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* General observations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="Adicione observações gerais sobre o checklist..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep("execute")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button
          className="flex-1"
          disabled={submitMutation.isPending}
          onClick={handleSubmit}
        >
          {submitMutation.isPending && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Enviar Checklist
        </Button>
      </div>
    </div>
  );
}
