import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader, Breadcrumb } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Car, Loader2 } from "lucide-react";
import { LABELS, VEHICLE_TYPES, VEHICLE_STATUSES } from "@shared/const";

type VehicleFormData = {
  plate: string;
  model: string;
  brand: string;
  year: number;
  color: string;
  vehicleType: typeof VEHICLE_TYPES[number];
  status: typeof VEHICLE_STATUSES[number];
  unitId?: number;
  chassi: string;
  renavam: string;
  currentKm: number;
  observations: string;
};

export function VehicleFormPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<VehicleFormData>({
    plate: "",
    model: "",
    brand: "",
    year: new Date().getFullYear(),
    color: "",
    vehicleType: "carro",
    status: "ativo",
    chassi: "",
    renavam: "",
    currentKm: 0,
    observations: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: vehicle, isLoading: vehicleLoading } = trpc.vehicles.getById.useQuery(
    { id: Number(id) },
    { enabled: isEditing }
  );

  const { data: units } = trpc.units.listActive.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.vehicles.create.useMutation({
    onSuccess: (data) => {
      toast.success("Veículo cadastrado com sucesso!");
      utils.vehicles.list.invalidate();
      navigate(`/vehicles/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar veículo");
    },
  });

  const updateMutation = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso!");
      utils.vehicles.list.invalidate();
      utils.vehicles.getById.invalidate({ id: Number(id) });
      navigate(`/vehicles/${id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar veículo");
    },
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        plate: vehicle.plate,
        model: vehicle.model,
        brand: vehicle.brand ?? "",
        year: vehicle.year,
        color: vehicle.color ?? "",
        vehicleType: vehicle.vehicleType,
        status: vehicle.status,
        unitId: vehicle.unitId ?? undefined,
        chassi: vehicle.chassi ?? "",
        renavam: vehicle.renavam ?? "",
        currentKm: vehicle.currentKm ?? 0,
        observations: vehicle.observations ?? "",
      });
    }
  }, [vehicle]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.plate || formData.plate.length < 7) {
      newErrors.plate = "Placa deve ter pelo menos 7 caracteres";
    }
    if (!formData.model) {
      newErrors.model = "Modelo é obrigatório";
    }
    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = "Ano inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data = {
      ...formData,
      plate: formData.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      brand: formData.brand || undefined,
      color: formData.color || undefined,
      chassi: formData.chassi || undefined,
      renavam: formData.renavam || undefined,
      observations: formData.observations || undefined,
      currentKm: formData.currentKm || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: Number(id), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleChange = (field: keyof VehicleFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && vehicleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Veículos", href: "/vehicles" },
          { label: isEditing ? "Editar" : "Novo Veículo" },
        ]}
      />

      <PageHeader
        title={isEditing ? `Editar ${vehicle?.plate}` : "Novo Veículo"}
        description={isEditing ? "Atualize os dados do veículo" : "Cadastre um novo veículo na frota"}
        icon={Car}
        backLink="/vehicles"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa *</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => handleChange("plate", e.target.value)}
                placeholder="ABC1D23"
                className="uppercase"
                maxLength={8}
              />
              {errors.plate && <p className="text-sm text-destructive">{errors.plate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleType">Tipo *</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(v) => handleChange("vehicleType", v as typeof VEHICLE_TYPES[number])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LABELS.vehicleTypes[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Ex: Volkswagen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                placeholder="Ex: Gol 1.6"
              />
              {errors.model && <p className="text-sm text-destructive">{errors.model}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Ano *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => handleChange("year", Number(e.target.value))}
                min={1900}
                max={new Date().getFullYear() + 1}
              />
              {errors.year && <p className="text-sm text-destructive">{errors.year}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                placeholder="Ex: Branco"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chassi">Chassi</Label>
              <Input
                id="chassi"
                value={formData.chassi}
                onChange={(e) => handleChange("chassi", e.target.value)}
                placeholder="Número do chassi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renavam">Renavam</Label>
              <Input
                id="renavam"
                value={formData.renavam}
                onChange={(e) => handleChange("renavam", e.target.value)}
                placeholder="Número do Renavam"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operacional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange("status", v as typeof VEHICLE_STATUSES[number])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LABELS.vehicleStatuses[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitId">Unidade</Label>
              <Select
                value={formData.unitId?.toString() ?? ""}
                onValueChange={(v) => handleChange("unitId", v ? Number(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentKm">Km Atual</Label>
              <Input
                id="currentKm"
                type="number"
                value={formData.currentKm}
                onChange={(e) => handleChange("currentKm", Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground">Quilometragem atual do veículo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.observations}
              onChange={(e) => handleChange("observations", e.target.value)}
              placeholder="Observações adicionais sobre o veículo..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/vehicles")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Cadastrar Veículo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
