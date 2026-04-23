import { useUser, isGestor } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Save, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FINE_STATUSES } from "@shared/const";
import { LABELS } from "@shared/const";

export function VehicleFineFormPage() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEditing = !!params.id;
  const fineId = params.id ? Number(params.id) : undefined;

  const [vehicleId, setVehicleId] = useState("");
  const [fineDate, setFineDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [autoInfracao, setAutoInfracao] = useState("");
  const [infraction, setInfraction] = useState("");
  const [fineLocation, setFineLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [points, setPoints] = useState("");
  const [status, setStatus] = useState("pendente");
  const [responsibleDriverId, setResponsibleDriverId] = useState("");
  const [observations, setObservations] = useState("");

  const { data: vehiclesList } = trpc.vehicles.list.useQuery();
  const { data: usersList } = trpc.users.list.useQuery();
  const { data: existingFine, isLoading: loadingFine } = trpc.vehicleFines.getById.useQuery(
    { id: fineId! },
    { enabled: isEditing && !!fineId }
  );

  const drivers = usersList?.filter((u) => u.role === "motorista" || u.role === "admin" || u.role === "gestor_frota");

  // Populate form when editing
  useEffect(() => {
    if (existingFine && isEditing) {
      setVehicleId(String(existingFine.vehicleId));
      setFineDate(existingFine.fineDate ? new Date(existingFine.fineDate).toISOString().split("T")[0] : "");
      setDueDate(existingFine.dueDate ? new Date(existingFine.dueDate).toISOString().split("T")[0] : "");
      setAutoInfracao(existingFine.autoInfracao || "");
      setInfraction(existingFine.infraction || "");
      setFineLocation(existingFine.location || "");
      setAmount(existingFine.amount ? String(Number(existingFine.amount)) : "");
      setDiscountAmount(existingFine.discountAmount ? String(Number(existingFine.discountAmount)) : "");
      setPoints(existingFine.points != null ? String(existingFine.points) : "");
      setStatus(existingFine.status || "pendente");
      setResponsibleDriverId(existingFine.responsibleDriverId ? String(existingFine.responsibleDriverId) : "");
      setObservations(existingFine.observations || "");
    }
  }, [existingFine, isEditing]);

  const utils = trpc.useUtils();

  const createMutation = trpc.vehicleFines.create.useMutation({
    onSuccess: () => {
      toast.success("Multa registrada com sucesso");
      utils.vehicleFines.invalidate();
      navigate("/fines");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar multa");
    },
  });

  const updateMutation = trpc.vehicleFines.update.useMutation({
    onSuccess: () => {
      toast.success("Multa atualizada com sucesso");
      utils.vehicleFines.invalidate();
      navigate("/fines");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar multa");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !fineDate || !infraction || !amount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (isEditing && fineId) {
      updateMutation.mutate({
        id: fineId,
        vehicleId: Number(vehicleId),
        fineDate: new Date(fineDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        autoInfracao: autoInfracao || null,
        infraction,
        location: fineLocation || null,
        amount: Number(amount),
        discountAmount: discountAmount ? Number(discountAmount) : null,
        points: points ? Number(points) : null,
        status: status as typeof FINE_STATUSES[number],
        responsibleDriverId: responsibleDriverId ? Number(responsibleDriverId) : null,
        observations: observations || null,
      });
    } else {
      createMutation.mutate({
        vehicleId: Number(vehicleId),
        fineDate: new Date(fineDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        autoInfracao: autoInfracao || undefined,
        infraction,
        location: fineLocation || undefined,
        amount: Number(amount),
        discountAmount: discountAmount ? Number(discountAmount) : undefined,
        points: points ? Number(points) : undefined,
        responsibleDriverId: responsibleDriverId ? Number(responsibleDriverId) : undefined,
        observations: observations || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingFine) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/fines">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={isEditing ? "Editar Multa" : "Registrar Multa"}
          description={isEditing ? "Edite os dados da multa de trânsito" : "Registre uma nova multa de trânsito para um veículo da frota"}
          icon={Receipt}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Multa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiclesList?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.plate} - {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista Responsável</Label>
                <Select value={responsibleDriverId} onValueChange={setResponsibleDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Data da Multa *</Label>
                <Input
                  type="date"
                  value={fineDate}
                  onChange={(e) => setFineDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Auto de Infração</Label>
                <Input
                  value={autoInfracao}
                  onChange={(e) => setAutoInfracao(e.target.value)}
                  placeholder="Número do auto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição da Infração *</Label>
              <Input
                value={infraction}
                onChange={(e) => setInfraction(e.target.value)}
                placeholder="Ex: Excesso de velocidade, Avanço de sinal..."
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Local da Infração</Label>
                <Input
                  value={fineLocation}
                  onChange={(e) => setFineLocation(e.target.value)}
                  placeholder="Ex: Av. Brasil, km 15"
                />
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LABELS.fineStatuses[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Valor da Multa (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valor com Desconto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Pontos na CNH</Label>
                <Input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observações adicionais..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link to="/fines">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? "Salvar Alterações" : "Registrar Multa"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
