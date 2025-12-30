import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Pages
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { VehiclesPage } from "@/pages/vehicles/VehiclesPage";
import { VehicleFormPage } from "@/pages/vehicles/VehicleFormPage";
import { VehicleDetailPage } from "@/pages/vehicles/VehicleDetailPage";
import { ChecklistsPage } from "@/pages/checklists/ChecklistsPage";
import { ChecklistExecutePage } from "@/pages/checklists/ChecklistExecutePage";
import { OccurrencesPage } from "@/pages/occurrences/OccurrencesPage";
import { OccurrenceFormPage } from "@/pages/occurrences/OccurrenceFormPage";
import { OccurrenceDetailPage } from "@/pages/occurrences/OccurrenceDetailPage";
import { ServiceOrdersPage } from "@/pages/service-orders/ServiceOrdersPage";
import { ServiceOrderFormPage } from "@/pages/service-orders/ServiceOrderFormPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { AuditLogsPage } from "@/pages/audit/AuditLogsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          {/* Dashboard */}
          <Route path="/" component={DashboardPage} />

          {/* Vehicles */}
          <Route path="/vehicles" component={VehiclesPage} />
          <Route path="/vehicles/new" component={VehicleFormPage} />
          <Route path="/vehicles/:id" component={VehicleDetailPage} />
          <Route path="/vehicles/:id/edit" component={VehicleFormPage} />

          {/* Checklists */}
          <Route path="/checklists" component={ChecklistsPage} />
          <Route path="/checklists/new" component={ChecklistExecutePage} />

          {/* Occurrences */}
          <Route path="/occurrences" component={OccurrencesPage} />
          <Route path="/occurrences/new" component={OccurrenceFormPage} />
          <Route path="/occurrences/:id" component={OccurrenceDetailPage} />

          {/* Service Orders */}
          <Route path="/service-orders" component={ServiceOrdersPage} />
          <Route path="/service-orders/new" component={ServiceOrderFormPage} />

          {/* Users - Admin only */}
          <Route path="/users">
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          </Route>

          {/* Audit Logs - Admin only */}
          <Route path="/audit">
            <AdminRoute>
              <AuditLogsPage />
            </AdminRoute>
          </Route>

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
