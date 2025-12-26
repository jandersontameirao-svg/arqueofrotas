import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight } from "lucide-react";
import { Link } from "wouter";

type AlertType = "warning" | "danger" | "info" | "success";

interface AlertItem {
  id: string | number;
  title: string;
  description?: string;
  link?: string;
}

interface AlertCardProps {
  title: string;
  type: AlertType;
  items: AlertItem[];
  emptyMessage?: string;
  viewAllLink?: string;
  className?: string;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    headerClass: "text-yellow-700 dark:text-yellow-400",
    itemClass: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
  },
  danger: {
    icon: AlertCircle,
    headerClass: "text-red-700 dark:text-red-400",
    itemClass: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  },
  info: {
    icon: Info,
    headerClass: "text-blue-700 dark:text-blue-400",
    itemClass: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  },
  success: {
    icon: CheckCircle,
    headerClass: "text-green-700 dark:text-green-400",
    itemClass: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  },
};

export function AlertCard({
  title,
  type,
  items,
  emptyMessage = "Nenhum item",
  viewAllLink,
  className,
}: AlertCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className={cn("flex items-center gap-2 text-base", config.headerClass)}>
          <Icon className="h-4 w-4" />
          {title}
          {items.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {emptyMessage}
          </p>
        ) : (
          <>
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "border-l-4 rounded-r-md p-3",
                  config.itemClass
                )}
              >
                {item.link ? (
                  <Link
                    to={item.link}
                    className="block hover:underline"
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
            {viewAllLink && items.length > 5 && (
              <Button variant="ghost" size="sm" asChild className="w-full mt-2">
                <Link to={viewAllLink}>
                  Ver todos ({items.length})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
