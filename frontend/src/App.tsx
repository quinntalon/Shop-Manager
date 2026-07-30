import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, ClerkLoading, ClerkLoaded } from "@clerk/react";
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
import StockTransfers from "@/pages/stock-transfers";
import { useRole, type Permission } from "@/hooks/use-role";
import { useSettings, applyTheme } from "@/hooks/use-settings";
import { ShieldAlert, LogOut } from "lucide-react";

const queryClient = new QueryClient();

let clerkPubKey: string | undefined;
try {
  clerkPubKey = publishableKeyFromHost(
    window.location.hostname,
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  );
} catch {
  clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
}

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  document.getElementById("root")!.innerHTML =
    `<div style="display:flex;min-height:100dvh;align-items:center;justify-content:center;font-family:sans-serif;padding:2rem;text-align:center">
      <div>
        <h1 style="font-size:1.25rem;font-weight:700;margin-bottom:.5rem">Configuration error</h1>
        <p style="color:#64748b;max-width:360px">
          <code>VITE_CLERK_PUBLISHABLE_KEY</code> is not set.<br/>
          Add it in Vercel → Settings → Environment Variables, then redeploy without cache.
        </p>
      </div>
    </div>`;
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
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-mu[...]
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
