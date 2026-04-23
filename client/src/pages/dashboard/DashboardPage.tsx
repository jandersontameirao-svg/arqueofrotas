import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { StatCard, StatCardGrid } from "@/components/cards/StatCard";
import { AlertCard } from "@/components/cards/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Car,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  FileWarning,
  Calendar,
  Activity,
  TrendingUp,
  Copy,
  Lock,
  Mail,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export function DashboardPage() {
  const { user } = useUser();
  const isGestor = user?.role === "admin" || user?.role === "gestor_frota";
  const isMotorista = user?.role === "motorista";
  const [copied, setCopied] = useState(false);

  // Queries based on role
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(
    undefined,
    { enabled: isGestor }
  );

  const { data: motoristaStats } = trpc.dashboard.getMotoristaStats.useQuery(
    undefined,
    { enabled: isMotorista }
  );

  const { data: recentActivity } = trpc.dashboard.getRecentActivity.useQuery(
    { limit: 5 },
    { enabled: isGestor }
  );

  const { data: expiringDocs } = trpc.vehicleDocuments.listExpiring.useQuery(
    { daysAhead: 30 },
    { enabled: isGestor }
  );

  const { data: openOccurrences } = trpc.occurrences.listOpen.useQuery(
    undefined,
    { enabled: isGestor }
  );

  const publicUrl = "arqueofrotas.arqueoapp.com";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isMotorista) {
    return <MotoristaDashboard stats={motoristaStats} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${user?.name?.split(" ")[0] ?? "Usuário"}`}
        description="Visão geral do sistema de gestão de frotas"
        icon={Activity}
      />

      {/* Main Layout: Dashboard + Publish Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Dashboard Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Stats */}
          <StatCardGrid>
            <StatCard
              title="Veículos Ativos"
              value={stats?.vehicles.ativos ?? 0}
              description={`${stats?.vehicles.disponibilidade ?? 0}% disponibilidade`}
              icon={Car}
              variant="success"
            />
            <StatCard
              title="Em Manutenção"
              value={stats?.vehicles.emManutencao ?? 0}
              description={`${stats?.serviceOrders.total ?? 0} OS abertas`}
              icon={Wrench}
              variant={stats?.vehicles.emManutencao ? "warning" : "default"}
            />
            <StatCard
              title="Checklists Hoje"
              value={stats?.checklists.hoje ?? 0}
              description={`${stats?.checklists.conformidade ?? 100}% conformidade`}
              icon={ClipboardCheck}
              variant={stats?.checklists.comProblemas ? "warning" : "success"}
            />
            <StatCard
              title="Ocorrências Abertas"
              value={stats?.occurrences.abertas ?? 0}
              description={`${stats?.occurrences.alta ?? 0} de alta severidade`}
              icon={AlertTriangle}
              variant={stats?.occurrences.alta ? "danger" : "default"}
            />
          </StatCardGrid>

          {/* Secondary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Documentos Vencidos"
              value={stats?.documents.vencidos ?? 0}
              icon={FileWarning}
              variant={stats?.documents.vencidos ? "danger" : "success"}
            />
            <StatCard
              title="Documentos a Vencer"
              value={stats?.documents.aVencer ?? 0}
              description="Próximos 30 dias"
              icon={Calendar}
              variant={stats?.documents.aVencer ? "warning" : "default"}
            />
            <StatCard
              title="Manutenções Vencidas"
              value={stats?.maintenance.vencidas ?? 0}
              icon={Wrench}
              variant={stats?.maintenance.vencidas ? "danger" : "success"}
            />
            <StatCard
              title="Manutenções a Vencer"
              value={stats?.maintenance.aVencer ?? 0}
              icon={Calendar}
              variant={stats?.maintenance.aVencer ? "warning" : "default"}
            />
          </div>

          {/* Alerts and Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Alerts */}
            <div className="space-y-4">
              <AlertCard
                title="Ocorrências de Alta Severidade"
                type="danger"
                items={
                  openOccurrences
                    ?.filter((o) => o.severity === "alta")
                    .slice(0, 5)
                    .map((o) => ({
                      id: o.id,
                      title: `${o.vehiclePlate} - ${o.vehicleModel}`,
                      description: o.description.substring(0, 60) + (o.description.length > 60 ? "..." : ""),
                      link: `/occurrences/${o.id}`,
                    })) ?? []
                }
                emptyMessage="Nenhuma ocorrência de alta severidade"
                viewAllLink="/occurrences"
              />

              <AlertCard
                title="Documentos a Vencer"
                type="warning"
                items={
                  expiringDocs?.slice(0, 5).map((d) => ({
                    id: d.id,
                    title: `${d.vehiclePlate} - ${d.documentType}`,
                    description: d.expirationDate
                      ? `Vence em ${format(new Date(d.expirationDate), "dd/MM/yyyy", { locale: ptBR })}`
                      : undefined,
                    link: `/vehicles/${d.vehicleId}`,
                  })) ?? []
                }
                emptyMessage="Nenhum documento próximo do vencimento"
                viewAllLink="/vehicles"
              />
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={`${activity.type}-${activity.id}-${index}`}
                        className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {activity.type === "checklist" && <ClipboardCheck className="h-4 w-4" />}
                          {activity.type === "occurrence" && <AlertTriangle className="h-4 w-4" />}
                          {activity.type === "service_order" && <Wrench className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.vehiclePlate}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma atividade recente
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/vehicles/new">
                    <Car className="h-4 w-4 mr-2" />
                    Novo Veículo
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/checklists/new">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Novo Checklist
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/occurrences/new">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Registrar Ocorrência
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/service-orders/new">
                    <Wrench className="h-4 w-4 mr-2" />
                    Abrir OS
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Publish Panel (Manus) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Publicar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">URL pública</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyUrl}
                    className="px-3"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600">Copiado para a área de transferência</p>
                )}
              </div>

              {/* Visibility Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Visibilidade</label>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Somente pessoas convidadas</span>
                </div>
              </div>

              {/* Invited Users Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Pessoas com acesso</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* User 1 */}
                  <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-bold">
                        J
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Janderson Rubens</p>
                        <p className="text-xs text-muted-foreground truncate">
                          jandersontameirao@gmail.com
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Proprietário</span>
                  </div>

                  {/* User 2 */}
                  <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                        S
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Silvio Alquimim</p>
                        <p className="text-xs text-muted-foreground truncate">
                          contato@arqueoproject.com.br
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Invite Section */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-medium">Convidar pessoa</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Digite o endereço de e-mail"
                    className="flex-1 px-3 py-2 text-sm border rounded-md"
                  />
                  <Button size="sm" className="px-3">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Motorista Dashboard Component
interface MotoristaDashboardProps {
  stats?: {
    reservasAtivas: number;
    reservasEmUso: number;
    checklistsHoje: number;
    ocorrenciasAbertas: number;
  };
}

function MotoristaDashboard({ stats }: MotoristaDashboardProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard do Motorista"
        description="Seus checklists e atividades"
        icon={Activity}
      />

      <StatCardGrid>
        <StatCard
          title="Reservas Ativas"
          value={stats?.reservasAtivas ?? 0}
          icon={Car}
          variant="success"
        />
        <StatCard
          title="Reservas em Uso"
          value={stats?.reservasEmUso ?? 0}
          icon={Car}
          variant="success"
        />
        <StatCard
          title="Checklists Hoje"
          value={stats?.checklistsHoje ?? 0}
          icon={ClipboardCheck}
          variant="success"
        />
        <StatCard
          title="Ocorrências Abertas"
          value={stats?.ocorrenciasAbertas ?? 0}
          icon={AlertTriangle}
          variant={stats?.ocorrenciasAbertas ? "warning" : "default"}
        />
      </StatCardGrid>
    </div>
  );
}
