import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

// Páginas carregadas sob demanda (code-splitting): cada rota vira um chunk
// separado, deixando a 1ª carga muito mais leve (importante no celular em campo).
const DriverPage = lazy(() =>
  import("@/pages/driver/DriverPage").then(m => ({ default: m.DriverPage }))
);
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then(m => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage }))
);
const VehiclesPage = lazy(() =>
  import("@/pages/vehicles/VehiclesPage").then(m => ({ default: m.VehiclesPage }))
);
const VehicleFormPage = lazy(() =>
  import("@/pages/vehicles/VehicleFormPage").then(m => ({ default: m.VehicleFormPage }))
);
const VehicleDetailPage = lazy(() =>
  import("@/pages/vehicles/VehicleDetailPage").then(m => ({ default: m.VehicleDetailPage }))
);
const ChecklistsPage = lazy(() =>
  import("@/pages/checklists/ChecklistsPage").then(m => ({ default: m.ChecklistsPage }))
);
const ChecklistExecutePage = lazy(() =>
  import("@/pages/checklists/ChecklistExecutePage").then(m => ({ default: m.ChecklistExecutePage }))
);
const ChecklistDetailPage = lazy(() =>
  import("@/pages/checklists/ChecklistDetailPage").then(m => ({ default: m.ChecklistDetailPage }))
);
const ChecklistTemplatesPage = lazy(() =>
  import("@/pages/checklist-templates/ChecklistTemplatesPage").then(m => ({ default: m.ChecklistTemplatesPage }))
);
const ChecklistTemplateFormPage = lazy(() =>
  import("@/pages/checklist-templates/ChecklistTemplateFormPage").then(m => ({ default: m.ChecklistTemplateFormPage }))
);
const ChecklistTemplateDetailPage = lazy(() =>
  import("@/pages/checklist-templates/ChecklistTemplateDetailPage").then(m => ({ default: m.ChecklistTemplateDetailPage }))
);
const OccurrencesPage = lazy(() =>
  import("@/pages/occurrences/OccurrencesPage").then(m => ({ default: m.OccurrencesPage }))
);
const OccurrenceFormPage = lazy(() =>
  import("@/pages/occurrences/OccurrenceFormPage").then(m => ({ default: m.OccurrenceFormPage }))
);
const OccurrenceDetailPage = lazy(() =>
  import("@/pages/occurrences/OccurrenceDetailPage").then(m => ({ default: m.OccurrenceDetailPage }))
);
const ServiceOrdersPage = lazy(() =>
  import("@/pages/service-orders/ServiceOrdersPage").then(m => ({ default: m.ServiceOrdersPage }))
);
const ServiceOrderFormPage = lazy(() =>
  import("@/pages/service-orders/ServiceOrderFormPage").then(m => ({ default: m.ServiceOrderFormPage }))
);
const ServiceOrderDetailPage = lazy(() =>
  import("@/pages/service-orders/ServiceOrderDetailPage").then(m => ({ default: m.ServiceOrderDetailPage }))
);
const UsersPage = lazy(() =>
  import("@/pages/users/UsersPage").then(m => ({ default: m.UsersPage }))
);
const UserFormPage = lazy(() =>
  import("@/pages/users/UserFormPage").then(m => ({ default: m.UserFormPage }))
);
const UserDetailPage = lazy(() =>
  import("@/pages/users/UserDetailPage").then(m => ({ default: m.UserDetailPage }))
);
const AuditLogsPage = lazy(() =>
  import("@/pages/audit/AuditLogsPage").then(m => ({ default: m.AuditLogsPage }))
);
const ServiceProvidersPage = lazy(() =>
  import("@/pages/service-providers/ServiceProvidersPage").then(m => ({ default: m.ServiceProvidersPage }))
);
const ServiceProviderFormPage = lazy(() =>
  import("@/pages/service-providers/ServiceProviderFormPage").then(m => ({ default: m.ServiceProviderFormPage }))
);
const VehicleFinesPage = lazy(() =>
  import("@/pages/fines/VehicleFinesPage").then(m => ({ default: m.VehicleFinesPage }))
);
const VehicleFineFormPage = lazy(() =>
  import("@/pages/fines/VehicleFineFormPage").then(m => ({ default: m.VehicleFineFormPage }))
);
const VehicleFineDetailPage = lazy(() =>
  import("@/pages/fines/VehicleFineDetailPage").then(m => ({ default: m.VehicleFineDetailPage }))
);
const VehicleAIPage = lazy(() =>
  import("@/pages/vehicles/VehicleAIPage").then(m => ({ default: m.VehicleAIPage }))
);
const NotificationsPage = lazy(() =>
  import("@/pages/notifications/NotificationsPage").then(m => ({ default: m.NotificationsPage }))
);
const AtenaPage = lazy(() =>
  import("@/pages/atena/AtenaPage").then(m => ({ default: m.AtenaPage }))
);
const ObservacoesPage = lazy(() =>
  import("@/pages/observacoes/ObservacoesPage").then(m => ({ default: m.ObservacoesPage }))
);
const ProjectsPage = lazy(() =>
  import("@/pages/projects/ProjectsPage").then(m => ({ default: m.ProjectsPage }))
);

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

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

          {/* Projects - Admin only */}
          <Route path="/projects">
            <AdminRoute>
              <ProjectsPage />
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

          {/* Atena — assistente de IA */}
          <Route path="/atena" component={AtenaPage} />

          {/* Observações — feedback interno */}
          <Route path="/observacoes" component={ObservacoesPage} />

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
          <Suspense fallback={<PageFallback />}>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route>
                <AppRoutes />
              </Route>
            </Switch>
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
