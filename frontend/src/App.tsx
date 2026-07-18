import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
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
import { useRole, type Permission } from "@/hooks/use-role";
import { useSettings, applyTheme } from "@/hooks/use-settings";
import { ShieldAlert } from "lucide-react";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(221, 83%, 53%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(214, 32%, 91%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 91%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg border border-slate-200",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    footerActionLink: "text-blue-600 font-semibold hover:text-blue-700",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-blue-600",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-700",
    logoBox: "flex justify-center",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
    formFieldInput: "border-slate-200 bg-slate-50 text-slate-900",
    footerAction: "bg-slate-50 border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "border-slate-200",
    otpCodeFieldInput: "border-slate-200",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  const { signOut } = useClerk();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      <button
        type="button"
        onClick={() => signOut({ redirectUrl: `${basePath}/sign-in` })}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function PendingAccess() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold">Waiting for access</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your account has been created, but an administrator hasn't assigned you a role yet.
        Please check back soon or contact your administrator.
      </p>
    </div>
  );
}

function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can, isLoading } = useRole();
  if (isLoading) return null;
  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isLoading, isPending, isError } = useRole();

  if (isLoading) return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (isError) return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-xl font-bold">Could not connect to server</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The API server isn't responding. Make sure <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">CLERK_SECRET_KEY</code> is set in Replit Secrets and restart the API Server workflow.
      </p>
    </div>
  );
  if (isPending) return <PendingAccess />;

  return (
    <Show when="signed-in">
      <Layout>
        <Switch>
          <Route path="/">
            <RequirePermission permission="dashboard">
              <Dashboard />
            </RequirePermission>
          </Route>
          <Route path="/inventory">
            <RequirePermission permission="inventory">
              <Products />
            </RequirePermission>
          </Route>
          <Route path="/sales">
            <RequirePermission permission="sales">
              <Sales />
            </RequirePermission>
          </Route>
          <Route path="/sales/new">
            <RequirePermission permission="sales">
              <NewSale />
            </RequirePermission>
          </Route>
          <Route path="/sales/:id">
            <RequirePermission permission="sales">
              <SaleDetail />
            </RequirePermission>
          </Route>
          <Route path="/categories">
            <RequirePermission permission="categories">
              <Categories />
            </RequirePermission>
          </Route>
          <Route path="/customers">
            <RequirePermission permission="customers">
              <CustomersPage />
            </RequirePermission>
          </Route>
          <Route path="/reports">
            <RequirePermission permission="reports">
              <ReportsPage />
            </RequirePermission>
          </Route>
          <Route path="/users">
            <RequirePermission permission="users">
              <UsersPage />
            </RequirePermission>
          </Route>
          <Route path="/settings">
            <RequirePermission permission="settings">
              <SettingsPage />
            </RequirePermission>
          </Route>
          <Route path="/settings/receipt-editor">
            <RequirePermission permission="settings">
              <ReceiptEditorPage />
            </RequirePermission>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </Show>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <AppRoutes />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ThemeSync() {
  const { settings } = useSettings();
  useEffect(() => {
    if (settings) {
      applyTheme(settings.themeMode, settings.primaryColor);
    }
  }, [settings?.themeMode, settings?.primaryColor]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { settings } = useSettings();

  const businessName = settings?.businessName || "Nexus POS";
  const logoImageUrl = settings?.logoUrl
    ? settings.logoUrl
    : `${window.location.origin}${basePath}/logo.svg`;
  const colorPrimary = settings?.primaryColor
    ? `hsl(${settings.primaryColor})`
    : clerkAppearance.variables.colorPrimary;

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={{
        ...clerkAppearance,
        options: { ...clerkAppearance.options, logoImageUrl },
        variables: { ...clerkAppearance.variables, colorPrimary },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: `Sign in to ${businessName}`,
            subtitle: "Welcome back! Please sign in to continue",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: `Get started with ${businessName} today`,
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <TooltipProvider>
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={HomeRedirect} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <ClerkProviderWithRoutes />
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
