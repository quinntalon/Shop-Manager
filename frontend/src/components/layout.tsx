import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Store,
  LogOut,
  User,
  Users,
  Settings as SettingsIcon,
  BookUser,
  BarChart2,
  Menu,
  X,
  ChevronLeft,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type Permission } from "@/hooks/use-role";
import { useSettings } from "@/hooks/use-settings";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

interface LayoutProps {
  children: ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  salesperson: "Salesperson",
  cashier: "Cashier",
};

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function BrandMark({ logoUrl, businessName }: { logoUrl: string | null; businessName: string }) {
  return logoUrl ? (
    <img src={logoUrl} alt={businessName} className="h-6 w-6 rounded object-cover" />
  ) : (
    <Store className="h-6 w-6 text-primary" />
  );
}

function SidebarContent({
  navItems,
  location,
  user,
  role,
  basePath,
  signOut,
  onNavClick,
  collapsed,
  onCollapseToggle,
}: {
  navItems: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[];
  location: string;
  user: ReturnType<typeof useUser>["user"];
  role: string | null;
  basePath: string;
  signOut: (opts: { redirectUrl: string }) => void;
  onNavClick?: () => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}) {
  const { settings } = useSettings();
  const businessName = settings?.businessName || "Nexus POS";
  const logoUrl = settings?.logoUrl ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-2 min-w-0">
          <BrandMark logoUrl={logoUrl} businessName={businessName} />
          {!collapsed && (
            <span className="text-lg font-bold truncate">{businessName}</span>
          )}
        </div>
        {onCollapseToggle && (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
          </button>
        )}
        {onNavClick && (
          <button
            type="button"
            onClick={onNavClick}
            className="sm:hidden flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                  collapsed ? "justify-center px-2" : "",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        )}

        {!collapsed && role && (
          <Badge variant="secondary" className="w-full justify-center" data-testid="badge-role">
            {ROLE_LABELS[role] ?? role}
          </Badge>
        )}

        {!collapsed && <ThemeToggle />}

        <button
          type="button"
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { role, can } = useRole();
  const { settings } = useSettings();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const businessName = settings?.businessName || "Nexus POS";
  const logoUrl = settings?.logoUrl ?? null;

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const allNavItems: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
    { href: "/inventory", label: "Inventory", icon: Package, permission: "inventory" },
    { href: "/stock-transfers", label: "Stock Transfers", icon: ArrowRightLeft, permission: "inventory" },
    { href: "/sales", label: "Sales", icon: ShoppingCart, permission: "sales" },
    { href: "/customers", label: "Customers", icon: BookUser, permission: "customers" },
    { href: "/reports", label: "Reports", icon: BarChart2, permission: "reports" },
    { href: "/categories", label: "Categories", icon: Tags, permission: "categories" },
    { href: "/users", label: "Users", icon: Users, permission: "users" },
    { href: "/settings", label: "Settings", icon: SettingsIcon, permission: "settings" },
  ];

  const navItems = allNavItems.filter((item) => can(item.permission));

  const sharedProps = { navItems, location, user, role, basePath, signOut };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden sm:flex flex-col border-r bg-card transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent
          {...sharedProps}
          collapsed={collapsed}
          onCollapseToggle={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* ── Mobile overlay backdrop ──────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 sm:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile slide-in sidebar ──────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r bg-card shadow-2xl transition-transform duration-300 ease-in-out sm:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          {...sharedProps}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark logoUrl={logoUrl} businessName={businessName} />
            <span className="text-base font-bold truncate">{businessName}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
