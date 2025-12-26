import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "ativo"
  | "manutencao"
  | "baixado"
  | "agendada"
  | "em_uso"
  | "concluida"
  | "cancelada"
  | "aberto"
  | "em_tratamento"
  | "encerrado"
  | "aberta"
  | "em_andamento"
  | "aguardando_pecas"
  | "em_dia"
  | "a_vencer"
  | "vencida";

type SeverityType = "alta" | "media" | "baixa";

const statusConfig: Record<
  StatusType,
  { label: string; className: string }
> = {
  // Vehicle status
  ativo: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
  },
  manutencao: {
    label: "Em Manutenção",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  },
  baixado: {
    label: "Baixado",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200",
  },
  // Reservation status
  agendada: {
    label: "Agendada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  },
  em_uso: {
    label: "Em Uso",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200",
  },
  concluida: {
    label: "Concluída",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200",
  },
  // Occurrence status
  aberto: {
    label: "Aberto",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  },
  em_tratamento: {
    label: "Em Tratamento",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  },
  encerrado: {
    label: "Encerrado",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
  },
  // Service order status
  aberta: {
    label: "Aberta",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  },
  em_andamento: {
    label: "Em Andamento",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  },
  aguardando_pecas: {
    label: "Aguardando Peças",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200",
  },
  // Maintenance status
  em_dia: {
    label: "Em Dia",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
  },
  a_vencer: {
    label: "A Vencer",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  },
  vencida: {
    label: "Vencida",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  },
};

const severityConfig: Record<SeverityType, { label: string; className: string }> = {
  alta: {
    label: "Alta",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  },
  media: {
    label: "Média",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  },
  baixa: {
    label: "Baixa",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
  },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-medium", className)}
    >
      {config.label}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: SeverityType;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  if (!config) {
    return <Badge variant="outline">{severity}</Badge>;
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-medium", className)}
    >
      {config.label}
    </Badge>
  );
}
