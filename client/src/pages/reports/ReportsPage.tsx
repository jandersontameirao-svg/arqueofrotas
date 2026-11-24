import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  FileText,
  Car,
  AlertTriangle,
  Wrench,
  Receipt,
  CarFront,
  DollarSign,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

const reports = [
  {
    title: "Veículos",
    description: "Lista completa da frota — exportável em CSV e PDF",
    icon: Car,
    to: "/vehicles",
  },
  {
    title: "Ocorrências",
    description: "Avarias e ocorrências — exportável em CSV e PDF",
    icon: AlertTriangle,
    to: "/occurrences",
  },
  {
    title: "Ordens de Serviço",
    description: "Manutenções e OS — exportável em CSV e PDF",
    icon: Wrench,
    to: "/service-orders",
  },
  {
    title: "Multas",
    description: "Multas de trânsito da frota",
    icon: Receipt,
    to: "/fines",
  },
  {
    title: "Sinistros",
    description: "Sinistros registrados da frota",
    icon: CarFront,
    to: "/accidents",
  },
  {
    title: "Custos da Frota",
    description: "Custos totais por veículo e geral — exportável em CSV",
    icon: DollarSign,
    to: "/costs",
  },
  {
    title: "Análise de Problemas",
    description: "Itens e veículos que mais geram problemas",
    icon: TrendingUp,
    to: "/analytics",
  },
];

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Central de relatórios e exportações da frota"
        icon={FileText}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <r.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
