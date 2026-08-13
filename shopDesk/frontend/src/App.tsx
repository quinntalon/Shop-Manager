import { useEffect, type ReactNode } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/inventory";
import Sales from "@/pages/sales";
import SaleDetail from "@/pages/sales/detail";
import NewSale from "@/pages/sales/new";
import Categories from "@/pages/categories";
import UsersPage from "@/pages/users";
import CustomersPage from "@/pages/customers";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import ReceiptEditorPage from "@/pages/settings/receipt-editor";
import StockTransfers from "@/pages/stock-transfers";
import { SignInPage, SignUpPage } from "@/pages/auth";
import { useRole, type Permission } from "@/hooks/use-role";
import { useSettings, applyTheme } from "@/hooks/use-settings";
import { ShieldAlert, LogOut } from "lucide-react";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = true,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function AuthCard({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-lg font-bold">SD</span>
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}


function PendingAccess() {
  const { signOut } = useRole();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><ShieldAlert className="h-8 w-8 text-muted-foreground" /></div>
      <h1 className="text-xl font-bold">Waiting for access</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Your application was submitted successfully. An administrator will review your details and assign your role.</p>
      <button type="button" onClick={() => void signOut()} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function RejectedAccess() {
  const { signOut } = useRole();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold">Application not approved</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Your application was not approved. Contact the administrator if you believe this was a mistake.</p>
      <button type="button" onClick={() => void signOut()} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">Sign out</button>
    </div>
  );
}

function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can, isLoading } = useRole();
  if (isLoading) return null;
  if (!can(permission)) {
    return <div className="flex flex-col items-center justify-center gap-3 p-10 text-center"><ShieldAlert className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">You don't have permission to view this page.</p></div>;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/"><RequirePermission permission="dashboard"><Dashboard /></RequirePermission></Route>
        <Route path="/inventory"><RequirePermission permission="inventory"><Products /></RequirePermission></Route>
        <Route path="/sales"><RequirePermission permission="sales"><Sales /></RequirePermission></Route>
        <Route path="/sales/new"><RequirePermission permission="sales"><NewSale /></RequirePermission></Route>
        <Route path="/sales/:id"><RequirePermission permission="sales"><SaleDetail /></RequirePermission></Route>
        <Route path="/categories"><RequirePermission permission="categories"><Categories /></RequirePermission></Route>
        <Route path="/customers"><RequirePermission permission="customers"><CustomersPage /></RequirePermission></Route>
        <Route path="/reports"><RequirePermission permission="reports"><ReportsPage /></RequirePermission></Route>
        <Route path="/users"><RequirePermission permission="users"><UsersPage /></RequirePermission></Route>
        <Route path="/settings"><RequirePermission permission="settings"><SettingsPage /></RequirePermission></Route>
        <Route path="/settings/receipt-editor"><RequirePermission permission="settings"><ReceiptEditorPage /></RequirePermission></Route>
        <Route path="/stock-transfers"><RequirePermission permission="inventory"><StockTransfers /></RequirePermission></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function HomeRedirect() {
  const { isLoading, isAuthenticated, isPending, isRejected, isError } = useRole();
  if (isLoading) return <div className="flex min-h-[100dvh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (isError) return <div className="flex min-h-[100dvh] items-center justify-center px-4 text-center"><p className="text-sm text-destructive">The server is unavailable. Please try again.</p></div>;
  if (!isAuthenticated) return <Redirect to="/sign-in" />;
  if (isPending) return <PendingAccess />;
  if (isRejected) return <RejectedAccess />;
  return <AppRoutes />;
}

function ThemeSync() {
  const { settings } = useSettings();
  useEffect(() => {
    if (settings) applyTheme(settings.themeMode, settings.primaryColor);
  }, [settings?.themeMode, settings?.primaryColor]);
  return null;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/sign-up" component={SignUpPage} />
            <Route component={HomeRedirect} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;