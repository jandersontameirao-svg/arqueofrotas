import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Phone, Mail, MapPin, Star, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { isGestor } from "@/lib/auth";

export function ServiceProvidersPage() {
  const { user } = useUser();
  const canEdit = isGestor(user);
  const [search, setSearch] = useState("");

  const { data: providers, isLoading, refetch } = trpc.serviceProviders.list.useQuery();

  const deleteMutation = trpc.serviceProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("Prestador desativado com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao desativar prestador");
    },
  });

  const filtered = providers?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.cnpj?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Prestadores de Serviço"
          description="Gerencie os prestadores de serviço e oficinas parceiras"
          icon={Building2}
        />
        {canEdit && (
          <Button asChild>
            <Link to="/service-providers/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Prestador
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((provider) => (
            <Card key={provider.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    {provider.cnpj && (
                      <p className="text-sm text-muted-foreground mt-1">CNPJ: {provider.cnpj}</p>
                    )}
                  </div>
                  {provider.rating && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {Number(provider.rating).toFixed(1)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {provider.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {provider.phone}
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {provider.email}
                  </div>
                )}
                {(provider.city || provider.state) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[provider.city, provider.state].filter(Boolean).join(" - ")}
                  </div>
                )}
                {provider.specialties && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {JSON.parse(provider.specialties || "[]").map((spec: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
                {canEdit && (
                  <div className="flex gap-2 pt-3 border-t mt-3">
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link to={`/service-providers/${provider.id}/edit`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Desativar este prestador?")) {
                          deleteMutation.mutate({ id: provider.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum prestador encontrado</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Tente ajustar sua busca" : "Cadastre o primeiro prestador de serviço"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
