import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { LanguageProvider } from "@/contexts/language-context";
import { Component, type ReactNode } from "react";
import { BranchProvider } from "@/contexts/branch-context";
import BranchesPage from "@/pages/branches";

// Error boundary: catches context-unavailable crashes during HMR and auto-reloads
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(_error: unknown, info: { componentStack: string }) {
    console.error("AppErrorBoundary caught:", _error);
    console.error("Component stack:", info.componentStack);
  }
  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1B2E8F]">
          <div className="text-center text-white">
            <div className="text-4xl mb-2">⚡</div>
            <p className="text-sm opacity-70">Reloading…</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages
import LandingPage from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import StudentProfile from "@/pages/students/profile";
import Evaluations from "@/pages/evaluations";
import Levels from "@/pages/levels";
import Payments from "@/pages/payments";
import Revenue from "@/pages/revenue";
import Performance from "@/pages/performance";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Behavioral from "@/pages/behavioral";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/groups/detail";
import SessionReportPage from "@/pages/groups/session-report";
import TeacherEarnings from "@/pages/groups/earnings";
import ParentConsultations from "@/pages/consultations/parent";
import AdminConsultations from "@/pages/consultations/admin";
import PsychologistConsultations from "@/pages/consultations/psychologist";
import NewsPage from "@/pages/news";
import InboxPage from "@/pages/inbox";
import RequestsPage from "@/pages/requests";
import GalleryPage from "@/pages/gallery";
import MyProfile from "@/pages/my-profile";
import PsychologistFeed from "@/pages/psychologist";
import PsychologistEarnings from "@/pages/psychologist/earnings";
import ProgramsPage from "@/pages/programs";
import AdminFinancialRequests from "@/pages/admin/financial-requests";
import StudioPage from "@/pages/studio";
import StudioProjectPage from "@/pages/studio/project";
import IdeaBoxPage from "@/pages/idea-box";
import RegistrationRequestsPage from "@/pages/admin/registration-requests";
import OurMethodPage from "@/pages/our-method";
import WebContentPage from "@/pages/admin/web-content";
import AdminLandingSettings from "@/pages/admin/landing-settings";
import AdminAiSettings from "@/pages/admin/ai-settings";
import AdminAiBuilder from "@/pages/admin/ai-builder";
import PublicPage from "@/pages/public-page";
import MarketingHub from "@/pages/admin/marketing-hub";
import AdminSalaries from "@/pages/admin/salaries";
import SchedulePage from "@/pages/schedule";
import PublicPageRenderer from "@/pages/public-page";
import CampaignLandingPage from "@/pages/campaign-landing";
import EmployeeDashboard from "@/pages/employee-dashboard";
import ParentDashboard from "@/pages/parent-dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({
  component: Component,
  allowedRoles,
  requiredPermission,
  redirectTo = "/login",
}: {
  component: any;
  allowedRoles?: string[];
  requiredPermission?: string;
  redirectTo?: string;
}) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (!user) return <Redirect to="/login" />;

  // Custom-role user: check permission key instead of role
  if ((user as any).customRoleId && requiredPermission) {
    const userPerms: string[] = (user as any).permissions ?? [];
    if (!userPerms.includes(requiredPermission))
      return <Redirect to={redirectTo} />;
    return <Component />;
  }

  // Base-role user: check allowedRoles as before
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Redirect to={redirectTo} />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />

      <Route path="/dashboard">
        <Layout>
          <ProtectedRoute
            component={Dashboard}
            allowedRoles={["admin", "accountant", "branch_manager"]}
            requiredPermission="dashboard"
          />
        </Layout>
      </Route>
      <Route path="/students">
        <Layout>
          <ProtectedRoute component={Students} requiredPermission="students" />
        </Layout>
      </Route>
      <Route path="/students/:id">
        <Layout>
          <ProtectedRoute
            component={StudentProfile}
            requiredPermission="students"
          />
        </Layout>
      </Route>
      <Route path="/evaluations">
        <Layout>
          <ProtectedRoute
            component={Evaluations}
            allowedRoles={["admin", "teacher", "branch_manager", "parent"]}
            requiredPermission="evaluations"
          />
        </Layout>
      </Route>
      <Route path="/levels">
        <Layout>
          <ProtectedRoute
            component={Levels}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="levels"
          />
        </Layout>
      </Route>
      <Route path="/payments">
        <Layout>
          <ProtectedRoute
            component={Payments}
            allowedRoles={[
              "admin",
              "parent",
              "accountant",
              "branch_manager",
              "receptionist",
            ]}
            requiredPermission="payments"
          />
        </Layout>
      </Route>
      <Route path="/revenue">
        <Layout>
          <ProtectedRoute
            component={Revenue}
            allowedRoles={["admin", "accountant", "branch_manager"]}
            requiredPermission="revenue"
          />
        </Layout>
      </Route>
      <Route path="/behavioral">
        <Layout>
          <ProtectedRoute
            component={Behavioral}
            allowedRoles={["admin", "teacher", "psychologist"]}
            requiredPermission="behavioral"
          />
        </Layout>
      </Route>
      <Route path="/performance">
        <Layout>
          <ProtectedRoute
            component={Performance}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="performance"
          />
        </Layout>
      </Route>
      <Route path="/users">
        <Layout>
          <ProtectedRoute
            component={Users}
            allowedRoles={["admin", "branch_manager"]}
            requiredPermission="users"
          />
        </Layout>
      </Route>
      <Route path="/employee-dashboard">
        <Layout>
          <ProtectedRoute
            component={EmployeeDashboard}
            allowedRoles={["teacher", "psychologist"]}
            requiredPermission="my_profile"
          />
        </Layout>
      </Route>
      <Route path="/parent-dashboard">
        <Layout>
          <ProtectedRoute
            component={ParentDashboard}
            allowedRoles={["parent"]}
            requiredPermission="my_profile"
          />
        </Layout>
      </Route>
      <Route path="/groups">
        <Layout>
          <ProtectedRoute
            component={Groups}
            allowedRoles={[
              "admin",
              "teacher",
              "branch_manager",
              "receptionist",
            ]}
            requiredPermission="groups"
          />
        </Layout>
      </Route>
      <Route path="/groups/earnings">
        <Layout>
          <ProtectedRoute
            component={TeacherEarnings}
            allowedRoles={["admin", "teacher", "branch_manager", "parent"]}
            requiredPermission="groups"
          />
        </Layout>
      </Route>
      <Route path="/groups/:groupId/sessions/:sessionId/report">
        <Layout>
          <ProtectedRoute
            component={SessionReportPage}
            allowedRoles={[
              "admin",
              "teacher",
              "psychologist",
              "branch_manager",
            ]}
            requiredPermission="groups"
          />
        </Layout>
      </Route>
      <Route path="/groups/:id">
        <Layout>
          <ProtectedRoute
            component={GroupDetail}
            allowedRoles={[
              "admin",
              "teacher",
              "psychologist",
              "branch_manager",
              "receptionist",
            ]}
            requiredPermission="groups"
          />
        </Layout>
      </Route>
      <Route path="/consultations">
        <Layout>
          <ProtectedRoute
            component={ParentConsultations}
            allowedRoles={["parent"]}
            requiredPermission="consultations"
          />
        </Layout>
      </Route>
      <Route path="/admin/consultations">
        <Layout>
          <ProtectedRoute
            component={AdminConsultations}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="consultations"
          />
        </Layout>
      </Route>
      <Route path="/psychologist/consultations">
        <Layout>
          <ProtectedRoute
            component={PsychologistConsultations}
            allowedRoles={["psychologist", "admin"]}
            requiredPermission="consultations"
          />
        </Layout>
      </Route>
      <Route path="/news">
        <Layout>
          <ProtectedRoute component={NewsPage} requiredPermission="news" />
        </Layout>
      </Route>
      <Route path="/requests">
        <Layout>
          <ProtectedRoute
            component={RequestsPage}
            allowedRoles={["admin", "teacher", "parent"]}
            requiredPermission="requests"
          />
        </Layout>
      </Route>
      <Route path="/inbox">
        <Layout>
          <ProtectedRoute component={InboxPage} requiredPermission="inbox" />
        </Layout>
      </Route>
      <Route path="/gallery">
        <Layout>
          <ProtectedRoute
            component={GalleryPage}
            requiredPermission="gallery"
          />
        </Layout>
      </Route>
      <Route path="/psychologist/feed">
        <Layout>
          <ProtectedRoute
            component={PsychologistFeed}
            allowedRoles={["admin", "teacher", "psychologist"]}
            requiredPermission="psychologist_feed"
          />
        </Layout>
      </Route>
      <Route path="/psychologist/sessions">
        <Layout>
          <ProtectedRoute
            component={Groups}
            allowedRoles={["psychologist", "admin"]}
            requiredPermission="psychologist_sessions"
          />
        </Layout>
      </Route>
      <Route path="/psychologist/earnings">
        <Layout>
          <ProtectedRoute
            component={PsychologistEarnings}
            allowedRoles={[
              "psychologist",
              "admin",
              "teacher",
              "receptionist",
              "accountant",
              "branch_manager",
            ]}
            requiredPermission="psychologist_earnings"
          />
        </Layout>
      </Route>
      <Route path="/programs">
        <Layout>
          <ProtectedRoute
            component={ProgramsPage}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="programs"
          />
        </Layout>
      </Route>
      <Route path="/admin/financial-requests">
        <Layout>
          <ProtectedRoute
            component={AdminFinancialRequests}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="financial_requests"
          />
        </Layout>
      </Route>
      <Route path="/studio/:id">
        <Layout>
          <ProtectedRoute
            component={StudioProjectPage}
            allowedRoles={["admin", "designer", "marketer", "photographer"]}
            requiredPermission="studio"
          />
        </Layout>
      </Route>
      <Route path="/studio">
        <Layout>
          <ProtectedRoute
            component={StudioPage}
            allowedRoles={["admin", "designer", "marketer", "photographer"]}
            requiredPermission="studio"
          />
        </Layout>
      </Route>
      <Route path="/settings">
        <Layout>
          <ProtectedRoute
            component={Settings}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="settings"
            redirectTo="/my-profile"
          />
        </Layout>
      </Route>
      <Route path="/my-profile">
        <Layout>
          <ProtectedRoute
            component={MyProfile}
            allowedRoles={[
              "teacher",
              "psychologist",
              "accountant",
              "photographer",
              "designer",
              "admin",
              "branch_manager",
              "receptionist",
            ]}
            requiredPermission="my_profile"
          />
        </Layout>
      </Route>
      <Route path="/idea-box">
        <Layout>
          <ProtectedRoute
            component={IdeaBoxPage}
            requiredPermission="idea_box"
          />
        </Layout>
      </Route>
      <Route path="/admin/registration-requests">
        <Layout>
          <ProtectedRoute
            component={RegistrationRequestsPage}
            allowedRoles={["admin", "receptionist"]}
            requiredPermission="registration_requests"
          />
        </Layout>
      </Route>
      <Route path="/our-method">
        <Layout>
          <ProtectedRoute
            component={OurMethodPage}
            allowedRoles={["parent", "admin"]}
          />
        </Layout>
      </Route>
      <Route path="/branches">
        <Layout>
          <ProtectedRoute
            component={BranchesPage}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="branches"
          />
        </Layout>
      </Route>
      <Route path="/admin/web-content">
        <Layout>
          <ProtectedRoute
            component={WebContentPage}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="web_content"
          />
        </Layout>
      </Route>
      <Route path="/admin/landing-settings">
        <AdminLandingSettings />
      </Route>
      <Route path="/admin/ai-settings">
        <AdminAiSettings />
      </Route>
      <Route path="/admin/ai-builder">
        <AdminAiBuilder />
      </Route>
      <Route path="/admin/marketing-hub">
        <Layout>
          <ProtectedRoute
            component={MarketingHub}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="marketing_hub"
          />
        </Layout>
      </Route>
      <Route path="/admin/salaries">
        <Layout>
          <ProtectedRoute
            component={AdminSalaries}
            allowedRoles={["admin", "teacher", "psychologist", "parent"]}
            requiredPermission="users"
          />
        </Layout>
      </Route>
      <Route path="/schedule">
        <Layout>
          <ProtectedRoute
            component={SchedulePage}
            requiredPermission="my_profile"
          />
        </Layout>
      </Route>
      <Route path="/p/:slug">
        <PublicPageRenderer />
      </Route>
      <Route path="/lp/:slug">
        <CampaignLandingPage />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <LanguageProvider>
        <BranchProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </BranchProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  );
}

export default App;
