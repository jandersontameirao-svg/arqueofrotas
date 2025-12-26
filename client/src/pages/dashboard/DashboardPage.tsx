import { useUser } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { StatCard, StatCardGrid } from "@/components/cards/StatCard";
import { AlertCard } from "@/components/cards/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
import {
  Car,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  FileWarning,
  Calendar,
  Activity,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DashboardPage() {
  const { user } = useUser();
  const isGestor = user?.role === "admin" || user?.role === "gestor_frota";
  const isMotorista = user?.role === "motorista";

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

  const { data: myReservations } = trpc.reservations.myActive.useQuery(
    undefined,
    { enabled: isMotorista }
  );

  if (isMotorista) {
    return <MotoristaDashboard stats={motoristaStats} reservations={myReservations} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${user?.name?.split(" ")[0] ?? "Usuário"}`}
        description="Visão geral do sistema de gestão de frotas"
        icon={Activity}
      />

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
              <Link to="/reservations/new">
                <Calendar className="h-4 w-4 mr-2" />
                Nova Reserva
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
  reservations?: Array<{
    id: number;
    vehiclePlate: string;
    vehicleModel: string;
    projectName: string;
    startDate: Date;
    endDate: Date;
    status: string;
    checkInAt: Date | null;
    checkInKm: number | null;
  }>;
}

function MotoristaDashboard({ stats, reservations }: MotoristaDashboardProps) {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${user?.name?.split(" ")[0] ?? "Motorista"}`}
        description="Suas reservas e atividades"
        icon={Activity}
      />

      <StatCardGrid>
        <StatCard
          title="Reservas Ativas"
          value={stats?.reservasAtivas ?? 0}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          title="Em Uso Agora"
          value={stats?.reservasEmUso ?? 0}
          icon={Car}
          variant={stats?.reservasEmUso ? "success" : "default"}
        />
        <StatCard
          title="Checklists Hoje"
          value={stats?.checklistsHoje ?? 0}
          icon={ClipboardCheck}
          variant="default"
        />
        <StatCard
          title="Minhas Ocorrências"
          value={stats?.ocorrenciasAbertas ?? 0}
          icon={AlertTriangle}
          variant={stats?.ocorrenciasAbertas ? "warning" : "default"}
        />
      </StatCardGrid>

      {/* My Reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Minhas Reservas
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reservations/new">Nova Reserva</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservations && reservations.length > 0 ? (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {reservation.vehiclePlate} - {reservation.vehicleModel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reservation.projectName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(reservation.startDate), "dd/MM HH:mm", { locale: ptBR })} -{" "}
                      {format(new Date(reservation.endDate), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={reservation.status as "agendada" | "em_uso"} />
                    <Button size="sm" asChild>
                      <Link to={`/reservations/${reservation.id}`}>
                        {reservation.status === "agendada" ? "Check-in" : "Detalhes"}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Você não tem reservas ativas
              </p>
              <Button asChild>
                <Link to="/reservations/new">Fazer uma Reserva</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            <Button variant="outline" asChild className="justify-start">
              <Link to="/checklists/new">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Fazer Checklist
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/occurrences/new">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Registrar Ocorrência
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/reservations">
                <Calendar className="h-4 w-4 mr-2" />
                Ver Reservas
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
