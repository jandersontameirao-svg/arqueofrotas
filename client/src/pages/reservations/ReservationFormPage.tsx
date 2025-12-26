import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUser } from "@/lib/auth";
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
import { Calendar, Loader2, Car, AlertCircle } from "lucide-react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS } from "@shared/const";

export function ReservationFormPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();

  // Parse URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedVehicleId = searchParams.get("vehicleId");

  const [formData, setFormData] = useState({
    vehicleId: preselectedVehicleId ? Number(preselectedVehicleId) : 0,
    projectId: 0,
    startDate: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(addHours(new Date(), 9), "yyyy-MM-dd'T'HH:mm"),
    purpose: "",
    destination: "",
    observations: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get available vehicles for the selected period
  const { data: availableVehicles, isLoading: vehiclesLoading } = trpc.vehicles.listAvailable.useQuery(
    {
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
    },
    {
      enabled: Boolean(formData.startDate && formData.endDate),
    }
  );

  const { data: projects } = trpc.projects.listActive.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: (data) => {
      toast.success("Reserva criada com sucesso!");
      utils.reservations.list.invalidate();
      navigate(`/reservations/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar reserva");
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = "Selecione um veículo";
    }
    if (!formData.projectId) {
      newErrors.projectId = "Selecione um projeto";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Data de início é obrigatória";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Data de fim é obrigatória";
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = "Data de fim deve ser posterior à data de início";
    }
    if (new Date(formData.startDate) < new Date()) {
      newErrors.startDate = "Data de início não pode ser no passado";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    createMutation.mutate({
      vehicleId: formData.vehicleId,
      projectId: formData.projectId,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      purpose: formData.purpose || undefined,
      location: formData.destination || undefined,
      observations: formData.observations || undefined,
    });
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const selectedVehicle = availableVehicles?.find((v) => v.id === formData.vehicleId);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Reservas", href: "/reservations" },
          { label: "Nova Reserva" },
        ]}
      />

      <PageHeader
        title="Nova Reserva"
        description="Reserve um veículo para uso"
        icon={Calendar}
        backLink="/reservations"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Período da Reserva</CardTitle>
            <CardDescription>
              Selecione o período para ver os veículos disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data/Hora de Início *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data/Hora de Fim *</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veículo</CardTitle>
            <CardDescription>
              {vehiclesLoading
                ? "Carregando veículos disponíveis..."
                : availableVehicles?.length
                ? `${availableVehicles.length} veículo(s) disponível(is) no período`
                : "Nenhum veículo disponível no período selecionado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehiclesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableVehicles && availableVehicles.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        formData.vehicleId === vehicle.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleChange("vehicleId", vehicle.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-mono font-medium">{vehicle.plate}</p>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {LABELS.vehicleTypes[vehicle.vehicleType as keyof typeof LABELS.vehicleTypes]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.vehicleId && (
                  <p className="text-sm text-destructive">{errors.vehicleId}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Nenhum veículo disponível para o período selecionado.
                </p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar as datas ou entre em contato com o gestor de frota.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Reserva</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectId">Projeto/Centro de Custo *</Label>
              <Select
                value={formData.projectId?.toString() ?? ""}
                onValueChange={(v) => handleChange("projectId", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.code} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => handleChange("destination", e.target.value)}
                placeholder="Ex: São Paulo - SP"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">Finalidade</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleChange("purpose", e.target.value)}
                placeholder="Ex: Visita técnica ao cliente"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleChange("observations", e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedVehicle && formData.projectId && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Resumo da Reserva</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Veículo</p>
                  <p className="font-medium">
                    {selectedVehicle.plate} - {selectedVehicle.model}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projeto</p>
                  <p className="font-medium">
                    {projects?.find((p) => p.id === formData.projectId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-medium">
                    {format(new Date(formData.startDate), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fim</p>
                  <p className="font-medium">
                    {format(new Date(formData.endDate), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/reservations")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || !formData.vehicleId || !formData.projectId}
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Criar Reserva
          </Button>
        </div>
      </form>
    </div>
  );
}
