import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Camera, X, Upload } from "lucide-react";
import { format } from "date-fns";
import { LABELS, SEVERITY_LEVELS } from "@shared/const";

export function OccurrenceFormPage() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedVehicleId = searchParams.get("vehicleId");

  const [formData, setFormData] = useState({
    vehicleId: preselectedVehicleId ? Number(preselectedVehicleId) : 0,
    severity: "media" as typeof SEVERITY_LEVELS[number],
    description: "",
    location: "",
    occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const { data: vehicles } = trpc.vehicles.list.useQuery({});

  const utils = trpc.useUtils();

  const createMutation = trpc.occurrences.create.useMutation({
    onSuccess: async (data) => {
      // Upload photos if any
      if (photos.length > 0) {
        setIsUploading(true);
        try {
          // TODO: Implement photo upload to S3
          toast.success("Ocorrência registrada com sucesso!");
        } catch {
          toast.warning("Ocorrência criada, mas houve erro ao enviar fotos");
        } finally {
          setIsUploading(false);
        }
      } else {
        toast.success("Ocorrência registrada com sucesso!");
      }
      utils.occurrences.list.invalidate();
      navigate(`/occurrences/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar ocorrência");
    },
  });

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 5) {
      toast.error("Máximo de 5 fotos permitidas");
      return;
    }

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotosPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = "Selecione um veículo";
    }
    if (!formData.description || formData.description.length < 10) {
      newErrors.description = "Descrição deve ter pelo menos 10 caracteres";
    }
    if (!formData.occurredAt) {
      newErrors.occurredAt = "Data/hora é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    createMutation.mutate({
      vehicleId: formData.vehicleId,
      severity: formData.severity,
      description: formData.description,
      location: formData.location || undefined,
      occurredAt: new Date(formData.occurredAt),
    });
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const isSubmitting = createMutation.isPending || isUploading;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Ocorrências", href: "/occurrences" },
          { label: "Nova Ocorrência" },
        ]}
      />

      <PageHeader
        title="Nova Ocorrência"
        description="Registre uma ocorrência ou avaria"
        icon={AlertTriangle}
        backLink="/occurrences"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Ocorrência</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Veículo *</Label>
              <Select
                value={formData.vehicleId?.toString() ?? ""}
                onValueChange={(v) => handleChange("vehicleId", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.plate} - {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && (
                <p className="text-sm text-destructive">{errors.vehicleId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severidade *</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => handleChange("severity", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a severidade" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {LABELS.severityLevels[severity]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurredAt">Data/Hora da Ocorrência *</Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) => handleChange("occurredAt", e.target.value)}
              />
              {errors.occurredAt && (
                <p className="text-sm text-destructive">{errors.occurredAt}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Ex: Rodovia BR-101, km 45"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Descreva detalhadamente o que aconteceu..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Evidências Fotográficas</CardTitle>
            <CardDescription>
              Adicione até 5 fotos para documentar a ocorrência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Photo previews */}
              {photosPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {photosPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={preview}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handlePhotoRemove(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo buttons */}
              {photos.length < 5 && (
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoAdd}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Fotos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // For mobile: capture from camera
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.capture = "environment";
                      input.onchange = (e) =>
                        handlePhotoAdd(e as unknown as React.ChangeEvent<HTMLInputElement>);
                      input.click();
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Tirar Foto
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {photos.length}/5 fotos adicionadas
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/occurrences")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar Ocorrência
          </Button>
        </div>
      </form>
    </div>
  );
}
