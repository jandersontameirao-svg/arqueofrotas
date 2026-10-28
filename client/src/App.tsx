import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

import { DriverPage } from "@/pages/driver/DriverPage";
import { LoginPage } from "@/pages/auth/LoginPage";

// Pages
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { VehiclesPage } from "@/pages/vehicles/VehiclesPage";
import { VehicleFormPage } from "@/pages/vehicles/VehicleFormPage";
import { VehicleDetailPage } from "@/pages/vehicles/VehicleDetailPage";
import { ChecklistsPage } from "@/pages/checklists/ChecklistsPage";
import { ChecklistExecutePage } from "@/pages/checklists/ChecklistExecutePage";
import { ChecklistDetailPage } from "@/pages/checklists/ChecklistDetailPage";
import { ChecklistTemplatesPage } from "@/pages/checklist-templates/ChecklistTemplatesPage";
import { ChecklistTemplateFormPage } from "@/pages/checklist-templates/ChecklistTemplateFormPage";
import { ChecklistTemplateDetailPage } from "@/pages/checklist-templates/ChecklistTemplateDetailPage";
import { OccurrencesPage } from "@/pages/occurrences/OccurrencesPage";
import { OccurrenceFormPage } from "@/pages/occurrences/OccurrenceFormPage";
import { OccurrenceDetailPage } from "@/pages/occurrences/OccurrenceDetailPage";
import { ServiceOrdersPage } from "@/pages/service-orders/ServiceOrdersPage";
import { ServiceOrderFormPage } from "@/pages/service-orders/ServiceOrderFormPage";
import { ServiceOrderDetailPage } from "@/pages/service-orders/ServiceOrderDetailPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { UserFormPage } from "@/pages/users/UserFormPage";
import { UserDetailPage } from "@/pages/users/UserDetailPage";
import { AuditLogsPage } from "@/pages/audit/AuditLogsPage";
import { ServiceProvidersPage } from "@/pages/service-providers/ServiceProvidersPage";
import { ServiceProviderFormPage } from "@/pages/service-providers/ServiceProviderFormPage";
import { VehicleFinesPage } from "@/pages/fines/VehicleFinesPage";
import { VehicleFineFormPage } from "@/pages/fines/VehicleFineFormPage";
import { VehicleFineDetailPage } from "@/pages/fines/VehicleFineDetailPage";
import { VehicleAIPage } from "@/pages/vehicles/VehicleAIPage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: true,
  });

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

function HomePage() {
  const { user } = useAuth();
  return user?.role === "motorista" ? <DriverPage /> : <DashboardPage />;
}
function AppRoutes() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          {/* Dashboard */}
          <Route path="/" component={HomePage} />
          <Route path="/driver" component={DriverPage} />

          {/* Vehicles */}
          <Route path="/vehicles" component={VehiclesPage} />
          <Route path="/vehicles/new" component={VehicleFormPage} />
          <Route path="/vehicles/ai-register" component={VehicleAIPage} />
          <Route path="/vehicles/:id" component={VehicleDetailPage} />
          <Route path="/vehicles/:id/edit" component={VehicleFormPage} />

          {/* Checklists */}
          <Route path="/checklists" component={ChecklistsPage} />
          <Route path="/checklists/new" component={ChecklistExecutePage} />
          <Route path="/checklists/:id" component={ChecklistDetailPage} />

          {/* Checklist Templates - Admin only */}
          <Route path="/checklist-templates">
            <AdminRoute>
              <ChecklistTemplatesPage />
            </AdminRoute>
          </Route>
          <Route path="/checklist-templates/new">
            <AdminRoute>
              <ChecklistTemplateFormPage />
            </AdminRoute>
          </Route>
          <Route path="/checklist-templates/:id">
            {params => (
              <AdminRoute>
                <ChecklistTemplateDetailPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/checklist-templates/:id/edit">
            {params => (
              <AdminRoute>
                <ChecklistTemplateFormPage />
              </AdminRoute>
            )}
          </Route>

          {/* Occurrences */}
          <Route path="/occurrences" component={OccurrencesPage} />
          <Route path="/occurrences/new" component={OccurrenceFormPage} />
          <Route path="/occurrences/:id/edit" component={OccurrenceFormPage} />
          <Route path="/occurrences/:id" component={OccurrenceDetailPage} />

          {/* Service Orders */}
          <Route path="/service-orders" component={ServiceOrdersPage} />
          <Route path="/service-orders/new" component={ServiceOrderFormPage} />
          <Route
            path="/service-orders/:id"
            component={ServiceOrderDetailPage}
          />

          {/* Users - Admin only */}
          <Route path="/users">
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          </Route>
          <Route path="/users/new">
            <AdminRoute>
              <UserFormPage />
            </AdminRoute>
          </Route>
          <Route path="/users/:id">
            <AdminRoute>
              <UserDetailPage />
            </AdminRoute>
          </Route>
          <Route path="/users/:id/edit">
            <AdminRoute>
              <UserFormPage />
            </AdminRoute>
          </Route>

          {/* Service Providers */}
          <Route path="/service-providers" component={ServiceProvidersPage} />
          <Route
            path="/service-providers/new"
            component={ServiceProviderFormPage}
          />
          <Route
            path="/service-providers/:id/edit"
            component={ServiceProviderFormPage}
          />

          {/* Vehicle Fines */}
          <Route path="/fines" component={VehicleFinesPage} />
          <Route path="/fines/new" component={VehicleFineFormPage} />
          <Route path="/fines/:id" component={VehicleFineDetailPage} />
          <Route path="/fines/:id/edit" component={VehicleFineFormPage} />

          {/* Vehicle AI Registration */}

          {/* Notifications */}
          <Route path="/notifications" component={NotificationsPage} />

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
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route>
              <AppRoutes />
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
