import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationsPage() {
  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery({
    limit: 100,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("Todas as notificações foram marcadas como lidas");
      refetch();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "os_aprovacao": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "os_aprovada": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "os_rejeitada": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "ocorrencia": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "multa": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "os_aprovacao": return "Aprovação de OS";
      case "os_aprovada": return "OS Aprovada";
      case "os_rejeitada": return "OS Rejeitada";
      case "ocorrencia": return "Ocorrência";
      case "multa": return "Multa";
      default: return "Notificação";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Notificações"
          description={unreadCount > 0 ? `${unreadCount} não lida(s)` : "Todas as notificações lidas"}
          icon={Bell}
        />
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${!notification.read ? "border-primary/30 bg-primary/5" : ""}`}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(notification.type)}`}>
                      {getTypeLabel(notification.type)}
                    </span>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-primary"></span>
                    )}
                  </div>
                  <p className={`text-sm ${!notification.read ? "font-medium" : ""}`}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {notification.entityType && notification.entityId && (
                    <Button size="icon" variant="ghost" asChild>
                      <Link to={
                        notification.entityType === "service_order" ? `/service-orders/${notification.entityId}` :
                        notification.entityType === "occurrence" ? `/occurrences/${notification.entityId}` :
                        notification.entityType === "vehicle" ? `/vehicles/${notification.entityId}` :
                        "#"
                      }>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {!notification.read && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ id: notification.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma notificação</p>
            <p className="text-sm text-muted-foreground">
              Você será notificado sobre aprovações, ocorrências e multas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
