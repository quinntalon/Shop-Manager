import { ReactNode } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole, type Permission } from "@/hooks/use-role";
import { useSettings } from "@/hooks/use-settings";
import { Badge } from "@/components/ui/badge";

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

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { role, can } = useRole();
  const { settings } = useSettings();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const businessName = settings?.businessName || "Nexus POS";
  const logoUrl = settings?.logoUrl ?? null;

  const allNavItems: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
    { href: "/inventory", label: "Inventory", icon: Package, permission: "inventory" },
    { href: "/sales", label: "Sales", icon: ShoppingCart, permission: "sales" },
    { href: "/categories", label: "Categories", icon: Tags, permission: "categories" },
    { href: "/users", label: "Users", icon: Users, permission: "users" },
    { href: "/settings", label: "Settings", icon: SettingsIcon, permission: "settings" },
  ];

  const navItems = allNavItems.filter((item) => can(item.permission));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="hidden w-64 flex-col border-r bg-card sm:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <BrandMark logoUrl={logoUrl} businessName={businessName} />
          <span className="text-lg font-bold truncate">{businessName}</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
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
          {role && (
            <Badge variant="secondary" className="mb-3 w-full justify-center" data-testid="badge-role">
              {ROLE_LABELS[role] ?? role}
            </Badge>
          )}
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6 sm:hidden">
          <div className="flex items-center gap-2">
            <BrandMark logoUrl={logoUrl} businessName={businessName} />
            <span className="text-lg font-bold truncate">{businessName}</span>
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
