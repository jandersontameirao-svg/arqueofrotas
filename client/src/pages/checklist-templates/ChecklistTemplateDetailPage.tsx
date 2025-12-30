import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  ArrowLeft,
  Pencil,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Car,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABELS } from "@shared/const";

export function ChecklistTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = parseInt(id || "0");

  const { data: template, isLoading } = trpc.checklistTemplates.getById.useQuery(
    { id: templateId },
    { enabled: templateId > 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Template não encontrado"
          description="O template solicitado não existe ou foi removido"
          icon={ClipboardList}
        />
        <Button variant="outline" asChild>
          <Link to="/checklist-templates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para lista
          </Link>
        </Button>
      </div>
    );
  }

  const getVehicleTypeLabel = (type: string | null) => {
    if (!type) return "Todos os tipos";
    return LABELS.vehicleTypes[type as keyof typeof LABELS.vehicleTypes] || type;
  };

  // Group items by category
  const itemsByCategory = template.items?.reduce((acc, item) => {
    const category = item.category || "Sem categoria";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof template.items>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/checklist-templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageHeader
            title={template.name}
            description={template.description || "Template de checklist"}
            icon={ClipboardList}
          />
        </div>
        <Button asChild>
          <Link to={`/checklist-templates/${template.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Itens do Checklist
                <span className="text-sm font-normal text-muted-foreground">
                  ({template.items?.length || 0} itens)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {template.items && template.items.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(itemsByCategory || {}).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {items?.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <span className="text-sm text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <div className="flex-1">
                              <p className="font-medium">{item.description}</p>
                            </div>
                            {item.isCritical && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Crítico
                              </Badge>
                            )}
                            {item.active ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum item cadastrado neste template
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {template.active ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inativo
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  Tipo de Veículo
                </span>
                <Badge variant="outline">{getVehicleTypeLabel(template.vehicleType)}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Criado em
                </span>
                <span className="text-sm">
                  {format(new Date(template.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Itens</span>
                <span className="font-medium">{template.items?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens Críticos</span>
                <span className="font-medium text-amber-600">
                  {template.items?.filter(i => i.isCritical).length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens Ativos</span>
                <span className="font-medium text-green-600">
                  {template.items?.filter(i => i.active).length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categorias</span>
                <span className="font-medium">
                  {Object.keys(itemsByCategory || {}).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
