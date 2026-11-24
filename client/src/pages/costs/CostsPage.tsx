import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Loader2,
  Wrench,
  Receipt,
  CarFront,
  Download,
  Search,
} from "lucide-react";
import { useState } from "react";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v || 0
  );

export function CostsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } =
    trpc.costs.summary.useQuery();

  const filtered = data?.byVehicle.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.plate?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.fleetNumber?.toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    if (!filtered || filtered.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }
    exportToCSV(
      filtered.map((v) => ({
        placa: v.plate,
        viatura: v.fleetNumber ?? "",
        modelo: v.model,
        manutencao: v.maintenance.toFixed(2),
        multas: v.fines.toFixed(2),
        sinistros: v.accidents.toFixed(2),
        total: v.total.toFixed(2),
      })),
      `custos_frota_${new Date().toISOString().split("T")[0]}`,
      [
        { key: "placa", label: "Placa" },
        { key: "viatura", label: "Nº Viatura" },
        { key: "modelo", label: "Modelo" },
        { key: "manutencao", label: "Manutenção (R$)" },
        { key: "multas", label: "Multas (R$)" },
        { key: "sinistros", label: "Sinistros (R$)" },
        { key: "total", label: "Total (R$)" },
      ]
    );
    toast.success("Custos exportados em CSV");
  };

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Custos da Frota"
          description="Custos totais, geral e por veículo (manutenção, multas e sinistros)"
          icon={DollarSign}
        />
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Erro ao carregar custos</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Tente novamente mais tarde"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Totais gerais */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Manutenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{brl(totals?.maintenance ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Multas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{brl(totals?.fines ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CarFront className="h-4 w-4" /> Sinistros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{brl(totals?.accidents ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Total Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {brl(totals?.total ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar veículo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Por veículo */}
          <Card>
            <CardHeader>
              <CardTitle>Custos por veículo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-3">Veículo</th>
                      <th className="p-3 text-right">Manutenção</th>
                      <th className="p-3 text-right">Multas</th>
                      <th className="p-3 text-right">Sinistros</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered && filtered.length > 0 ? (
                      filtered.map((v) => (
                        <tr key={v.vehicleId} className="border-b last:border-0">
                          <td className="p-3">
                            <span className="font-mono font-medium">
                              {v.plate}
                            </span>
                            {v.fleetNumber && (
                              <span className="text-xs text-muted-foreground ml-2">
                                Viatura {v.fleetNumber}
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {v.model}
                            </p>
                          </td>
                          <td className="p-3 text-right">{brl(v.maintenance)}</td>
                          <td className="p-3 text-right">{brl(v.fines)}</td>
                          <td className="p-3 text-right">{brl(v.accidents)}</td>
                          <td className="p-3 text-right font-semibold">
                            {brl(v.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-6 text-center text-muted-foreground"
                        >
                          Nenhum custo registrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
