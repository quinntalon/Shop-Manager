import { useEffect, useState, type ReactNode } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import { useRole, type Permission } from "@/hooks/use-role";
import { useSettings, applyTheme } from "@/hooks/use-settings";
import { authQueryKey, login, register } from "@/lib/auth";
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

function SignInPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login({ username, password });
      queryClient.setQueryData(authQueryKey, result.user);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Sign in to ShopDesk" subtitle="Use your approved account to continue">
      <form className="mx-auto max-w-md space-y-4" onSubmit={handleSubmit}>
        <Field label="Username" name="username" value={username} onChange={setUsername} autoComplete="username" />
        <Field label="Password" name="password" value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <a className="font-semibold text-primary hover:underline" href="/sign-up">Submit an application</a>
        </p>
      </form>
    </AuthCard>
  );
}

function SignUpPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: "", address: "", username: "", password: "", email: "",
    phone: "", nextOfKinName: "", nextOfKinPhone: "", position: "", applicationNotes: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const update = (name: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [name]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await register(form);
      queryClient.setQueryData(authQueryKey, result.user);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Apply for access" subtitle="Complete the form. An administrator will review your application.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" value={form.fullName} onChange={update("fullName")} />
          <Field label="Position applied for" name="position" value={form.position} onChange={update("position")} placeholder="e.g. Cashier" />
          <Field label="Username" name="username" value={form.username} onChange={update("username")} placeholder="letters, numbers, dots or dashes" />
          <Field label="Password" name="password" value={form.password} onChange={update("password")} type="password" />
          <Field label="Email address" name="email" value={form.email} onChange={update("email")} type="email" required={false} />
          <Field label="Phone number" name="phone" value={form.phone} onChange={update("phone")} />
        </div>
        <Field label="Address" name="address" value={form.address} onChange={update("address")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Next-of-kin name" name="nextOfKinName" value={form.nextOfKinName} onChange={update("nextOfKinName")} />
          <Field label="Next-of-kin phone" name="nextOfKinPhone" value={form.nextOfKinPhone} onChange={update("nextOfKinPhone")} />
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Additional information</span>
          <textarea
            name="applicationNotes"
            value={form.applicationNotes}
            onChange={(event) => update("applicationNotes")(event.target.value)}
            rows={3}
            placeholder="Anything else the administrator should know?"
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60" disabled={isSubmitting}>
          {isSubmitting ? "Submitting application…" : "Submit application"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already applied?{" "}
          <a className="font-semibold text-primary hover:underline" href="/sign-in">Sign in</a>
        </p>
      </form>
    </AuthCard>
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