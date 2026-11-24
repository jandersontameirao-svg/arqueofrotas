import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Loader2, AlertTriangle, Car } from "lucide-react";

export function AnalyticsPage() {
  const { data, isLoading, isError, error } =
    trpc.analytics.problemItems.useQuery();

  const maxItem = data?.topItems[0]?.count ?? 1;
  const maxVeh = data?.topVehicles[0]?.score ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise de Problemas"
        description="Itens e veículos que mais geram problemas, a partir dos checklists, ocorrências e ordens de serviço"
        icon={TrendingUp}
      />

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Erro ao carregar análise</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Tente novamente mais tarde"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-muted/40">
            <CardContent className="py-4 text-sm text-muted-foreground">
              Esta análise é baseada em dados reais (frequência de respostas
              "Não OK", ocorrências e ordens de serviço). Serve como base para,
              futuramente, alimentar uma camada de IA que gere recomendações.
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total de "Não OK"
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.totalNaoOk ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Ocorrências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data?.totalOccurrences ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Por severidade
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap pt-1">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Alta: {data?.bySeverity?.alta ?? 0}
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Média: {data?.bySeverity?.media ?? 0}
                </Badge>
                <Badge variant="outline">Baixa: {data?.bySeverity?.baixa ?? 0}</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Itens mais problemáticos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Itens que mais reprovam
                </CardTitle>
                <CardDescription>
                  Itens de checklist com mais respostas "Não OK"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data && data.topItems.length > 0 ? (
                  data.topItems.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.description}
                          {item.isCritical && (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-red-50 text-red-700 border-red-200"
                            >
                              Crítico
                            </Badge>
                          )}
                        </span>
                        <span className="text-sm font-semibold shrink-0">
                          {item.count}
                        </span>
                      </div>
                      <Progress value={(item.count / maxItem) * 100} className="h-2" />
                      {item.category && (
                        <p className="text-xs text-muted-foreground">
                          {item.category}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sem dados de checklist ainda.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Veículos mais problemáticos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-4 w-4 text-primary" />
                  Veículos com mais problemas
                </CardTitle>
                <CardDescription>
                  Soma de "Não OK", ocorrências e ordens de serviço
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data && data.topVehicles.length > 0 ? (
                  data.topVehicles.map((v) => (
                    <div key={v.vehicleId} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          <span className="font-mono">{v.plate}</span>
                          {v.fleetNumber ? ` · Viatura ${v.fleetNumber}` : ""}
                        </span>
                        <span className="text-sm font-semibold shrink-0">
                          {v.score}
                        </span>
                      </div>
                      <Progress value={(v.score / maxVeh) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {v.naoOk} Não OK · {v.occurrences} ocorrências (
                        {v.openOccurrences} abertas) · {v.serviceOrders} OS
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sem dados suficientes ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
