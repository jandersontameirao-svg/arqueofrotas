import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TemplateItem {
  id?: number;
  description: string;
  category: string;
  isCritical: boolean;
  order: number;
  isNew?: boolean;
}

export function ChecklistTemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEditing = !!id && id !== "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("all");
  const [active, setActive] = useState(true);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemCritical, setNewItemCritical] = useState(false);

  // Fetch existing template if editing
  const { data: template, isLoading } = trpc.checklistTemplates.getById.useQuery(
    { id: parseInt(id || "0") },
    { enabled: isEditing }
  );

  // Load template data
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setVehicleType(template.vehicleType || "all");
      setActive(template.active);
      setItems(
        template.items?.map((item, index) => ({
          id: item.id,
          description: item.description,
          category: item.category || "",
          isCritical: item.isCritical,
          order: item.order ?? index,
        })) || []
      );
    }
  }, [template]);

  const createMutation = trpc.checklistTemplates.create.useMutation({
    onSuccess: async (data) => {
      // Add items to the new template
      for (let i = 0; i < items.length; i++) {
        await addItemMutation.mutateAsync({
          templateId: data.id,
          description: items[i].description,
          category: items[i].category || undefined,
          isCritical: items[i].isCritical,
          order: i,
        });
      }
      toast.success("Template criado com sucesso!");
      navigate("/checklist-templates");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar template");
    },
  });

  const updateMutation = trpc.checklistTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template atualizado com sucesso!");
      navigate("/checklist-templates");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar template");
    },
  });

  const addItemMutation = trpc.checklistTemplates.addItem.useMutation();
  const updateItemMutation = trpc.checklistTemplates.updateItem.useMutation();
  const deleteItemMutation = trpc.checklistTemplates.deleteItem.useMutation();

  const handleAddItem = () => {
    if (!newItemDescription.trim()) {
      toast.error("Informe a descrição do item");
      return;
    }

    const newItem: TemplateItem = {
      description: newItemDescription,
      category: newItemCategory,
      isCritical: newItemCritical,
      order: items.length,
      isNew: true,
    };

    setItems([...items, newItem]);
    setNewItemDescription("");
    setNewItemCategory("");
    setNewItemCritical(false);
  };

  const handleRemoveItem = async (index: number) => {
    const item = items[index];
    if (item.id && !item.isNew) {
      // Delete from database
      try {
        await deleteItemMutation.mutateAsync({ id: item.id });
      } catch (error) {
        toast.error("Erro ao remover item");
        return;
      }
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleToggleCritical = (index: number) => {
    const newItems = [...items];
    newItems[index].isCritical = !newItems[index].isCritical;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do template");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item ao checklist");
      return;
    }

    const templateData = {
      name,
      description: description || undefined,
      vehicleType: vehicleType === "all" ? null : vehicleType as "carro" | "moto" | "caminhao" | "van" | "caminhonete",
      active,
    };

    if (isEditing) {
      // Update template
      await updateMutation.mutateAsync({ id: parseInt(id!), ...templateData });

      // Update existing items and add new ones
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id && !item.isNew) {
          await updateItemMutation.mutateAsync({
            id: item.id,
            description: item.description,
            category: item.category || undefined,
            isCritical: item.isCritical,
            order: i,
          });
        } else {
          await addItemMutation.mutateAsync({
            templateId: parseInt(id!),
            description: item.description,
            category: item.category || undefined,
            isCritical: item.isCritical,
            order: i,
          });
        }
      }
    } else {
      createMutation.mutate(templateData);
    }
  };

  const categories = ["Documentação", "Exterior", "Interior", "Motor", "Pneus", "Segurança", "Elétrica", "Outros"];

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/checklist-templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={isEditing ? "Editar Template" : "Novo Template"}
          description={isEditing ? "Modifique os itens do checklist" : "Crie um novo modelo de checklist"}
          icon={ClipboardList}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Checklist de Saída - Veículos Leves"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o propósito deste checklist..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger id="vehicleType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="carro">Carro</SelectItem>
                        <SelectItem value="moto">Moto</SelectItem>
                        <SelectItem value="caminhao">Caminhão</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="caminhonete">Caminhonete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between space-x-2 pt-6">
                    <Label htmlFor="active">Template Ativo</Label>
                    <Switch
                      id="active"
                      checked={active}
                      onCheckedChange={setActive}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Itens do Checklist</CardTitle>
                <CardDescription>
                  Adicione os itens que serão verificados durante a inspeção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Item */}
                <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Descrição do Item</Label>
                      <Input
                        placeholder="Ex: Verificar nível de óleo"
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="newItemCritical"
                        checked={newItemCritical}
                        onCheckedChange={setNewItemCritical}
                      />
                      <Label htmlFor="newItemCritical" className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Item Crítico
                      </Label>
                    </div>
                    <Button type="button" onClick={handleAddItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {items.length > 0 ? (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.description}</p>
                          {item.category && (
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                          )}
                        </div>
                        {item.isCritical && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Crítico
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleCritical(index)}
                          title={item.isCritical ? "Remover crítico" : "Marcar como crítico"}
                        >
                          <AlertTriangle className={`h-4 w-4 ${item.isCritical ? "text-amber-500" : "text-muted-foreground"}`} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum item adicionado. Use o formulário acima para adicionar itens ao checklist.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Itens</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itens Críticos</span>
                  <span className="font-medium">{items.filter(i => i.isCritical).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categorias</span>
                  <span className="font-medium">
                    {new Set(items.filter(i => i.category).map(i => i.category)).size}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending || updateMutation.isPending
                ? "Salvando..."
                : isEditing
                ? "Salvar Alterações"
                : "Criar Template"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
