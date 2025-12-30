import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Wrench,
  Car,
  User,
  AlertTriangle,
  ArrowLeft,
  Save,
  Building2,
  Phone,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LABELS } from "@shared/const";

interface ServiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function ServiceOrderFormPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const preselectedVehicleId = searchParams.get("vehicleId");
  const preselectedOccurrenceId = searchParams.get("occurrenceId");

  const { user } = useUser();

  const [vehicleId, setVehicleId] = useState<string>(preselectedVehicleId || "");
  const [maintenanceType, setMaintenanceType] = useState<string>("corretiva");
  const [priority, setPriority] = useState<string>("media");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [items, setItems] = useState<ServiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  // Fetch vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = trpc.vehicles.list.useQuery();

  // Fetch maintenance users
  const { data: maintenanceUsers } = trpc.users.list.useQuery();

  // Fetch occurrence details if coming from occurrence
  const { data: occurrence } = trpc.occurrences.getById.useQuery(
    { id: parseInt(preselectedOccurrenceId || "0") },
    { enabled: !!preselectedOccurrenceId }
  );

  // Set description from occurrence
  useEffect(() => {
    if (occurrence) {
      setDescription(`Ocorrência #${occurrence.id}: ${occurrence.description}`);
      if (occurrence.severity === "alta") {
        setPriority("alta");
      }
    }
  }, [occurrence]);

  const createMutation = trpc.serviceOrders.create.useMutation({
    onSuccess: (data) => {
      toast.success("Ordem de serviço criada com sucesso!");
      navigate(`/service-orders`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar ordem de serviço");
    },
  });

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof ServiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.error("Selecione um veículo");
      return;
    }

    if (!description.trim()) {
      toast.error("Informe a descrição do serviço");
      return;
    }

    createMutation.mutate({
      vehicleId: parseInt(vehicleId),
      maintenanceType: maintenanceType as "preventiva" | "corretiva",
      priority: priority as "baixa" | "media" | "alta",
      description,
      assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
      supplierName: supplierName || undefined,
      supplierContact: supplierContact || undefined,
      occurrenceId: preselectedOccurrenceId ? parseInt(preselectedOccurrenceId) : undefined,
    });
  };

  const filteredUsers = maintenanceUsers?.filter(
    (u) => u.role === "manutencao" || u.role === "admin" || u.role === "gestor_frota"
  );

  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/service-orders">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Nova Ordem de Serviço"
          description="Abrir uma nova ordem de serviço para manutenção"
          icon={Wrench}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle and Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Veículo e Tipo de Manutenção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Veículo *</Label>
                    <Select
                      value={vehicleId}
                      onValueChange={setVehicleId}
                      disabled={!!preselectedVehicleId}
                    >
                      <SelectTrigger id="vehicle">
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles?.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.plate} - {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maintenanceType">Tipo de Manutenção *</Label>
                    <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                      <SelectTrigger id="maintenanceType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventiva">Preventiva</SelectItem>
                        <SelectItem value="corretiva">Corretiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade *</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          Baixa
                        </span>
                      </SelectItem>
                      <SelectItem value="media">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                          Média
                        </span>
                      </SelectItem>
                      <SelectItem value="alta">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          Alta
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Descrição do Serviço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o serviço a ser realizado..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Service Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Itens do Serviço
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
                <CardDescription>
                  Opcional: liste os itens/peças necessários para o serviço
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <Label>Descrição do Item</Label>
                        <Input
                          placeholder="Ex: Troca de óleo, Filtro de ar..."
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="w-32 space-y-2">
                        <Label>Valor Unit.</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="R$ 0,00"
                          value={item.unitPrice || ""}
                          onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="pt-8">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {totalValue > 0 && (
                    <div className="flex justify-end pt-4 border-t">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Estimado</p>
                        <p className="text-xl font-bold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(totalValue)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Atribuir para</Label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger id="assignedTo">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não atribuído</SelectItem>
                      {filteredUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Fornecedor/Oficina
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Nome</Label>
                  <Input
                    id="supplierName"
                    placeholder="Nome da oficina ou fornecedor"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierContact">Contato</Label>
                  <Input
                    id="supplierContact"
                    placeholder="Telefone ou e-mail"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Origin Info */}
            {preselectedOccurrenceId && occurrence && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Origem: Ocorrência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Esta OS está vinculada à ocorrência <strong>#{occurrence.id}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {occurrence.vehiclePlate} - {occurrence.vehicleModel}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Salvando..." : "Abrir Ordem de Serviço"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
