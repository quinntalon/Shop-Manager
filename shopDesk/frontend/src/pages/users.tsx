import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  useUpdateUserRole,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import type { AppUser } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users as UsersIcon, Trash2, ShieldCheck, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  salesperson: "Salesperson",
  cashier: "Cashier",
};

type Permission = "dashboard" | "inventory" | "sales" | "categories" | "users" | "settings" | "customers" | "reports";

const ALL_PERMISSIONS: { id: Permission; label: string; description: string }[] = [
  { id: "dashboard",  label: "Dashboard",  description: "View sales summaries and charts" },
  { id: "sales",      label: "Sales",      description: "Create and view sales transactions" },
  { id: "customers",  label: "Customers",  description: "View customer history and purchase records" },
  { id: "inventory",  label: "Inventory",  description: "Add and manage products and stock levels" },
  { id: "categories", label: "Categories", description: "Add and manage product categories" },
  { id: "reports",    label: "Reports",    description: "View revenue reports and analytics" },
  { id: "users",      label: "Users",      description: "Manage user accounts and roles" },
  { id: "settings",   label: "Settings",   description: "Edit branding, theme and receipt templates" },
];

const ROLE_DEFAULTS: Record<string, Permission[]> = {
  admin:       ["dashboard", "inventory", "sales", "categories", "users", "settings", "customers", "reports"],
  salesperson: ["dashboard", "sales", "customers"],
  cashier:     ["sales"],
};

function getDefaultsForRole(role: string | null | undefined): Permission[] {
  return role ? (ROLE_DEFAULTS[role] ?? []) : [];
}

function isCustom(user: AppUser): boolean {
  const perms = user.permissions;
  if (!perms || perms.length === 0) return false;
  const defaults = getDefaultsForRole(user.role);
  if (perms.length !== defaults.length) return true;
  const sortedPerms = [...perms].sort();
  const sortedDefaults = [...defaults].sort();
  return sortedPerms.some((p, i) => p !== sortedDefaults[i]);
}

interface PermissionDialogProps {
  user: AppUser;
  open: boolean;
  onClose: () => void;
  onSave: (username: string, permissions: Permission[] | null) => void;
  isSaving: boolean;
}

function PermissionDialog({ user, open, onClose, onSave, isSaving }: PermissionDialogProps) {
  const roleDefaults = getDefaultsForRole(user.role);

  // Start with the user's current effective permissions
  const initialPerms: Permission[] =
    user.permissions && user.permissions.length > 0
      ? (user.permissions as Permission[])
      : roleDefaults;

  const [selected, setSelected] = useState<Set<Permission>>(new Set(initialPerms));
  const [isCustomMode, setIsCustomMode] = useState(
    isCustom(user)
  );

  function toggle(perm: Permission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
    setIsCustomMode(true);
  }

  function resetToDefaults() {
    setSelected(new Set(roleDefaults));
    setIsCustomMode(false);
  }

  function handleSave() {
    if (!isCustomMode) {
      onSave(user.username, null); // null = use role defaults
    } else {
      onSave(user.username, Array.from(selected) as Permission[]);
    }
  }

  const currentDefaults = new Set(roleDefaults);
  const hasChanges =
    isCustomMode !== isCustom(user) ||
    (isCustomMode && (
      selected.size !== (user.permissions?.length ?? 0) ||
      [...selected].some((p) => !user.permissions?.includes(p))
    )) ||
    (!isCustomMode && isCustom(user));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{user.name || user.email}</span>
            {" · "}
            <span className="capitalize">{user.role ? ROLE_LABELS[user.role] : "No role"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode indicator */}
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
            <div className="text-sm">
              {isCustomMode ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                  Custom permissions
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                  Using role defaults
                  {user.role && (
                    <span className="ml-1 text-xs">({ROLE_LABELS[user.role]})</span>
                  )}
                </span>
              )}
            </div>
            {isCustomMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={resetToDefaults}
              >
                <RotateCcw className="h-3 w-3" />
                Reset to defaults
              </Button>
            )}
          </div>

          {/* Permission checkboxes */}
          <div className="space-y-1">
            {ALL_PERMISSIONS.map((perm) => {
              const checked = selected.has(perm.id);
              const isDefault = currentDefaults.has(perm.id);

              return (
                <label
                  key={perm.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60",
                    checked && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(perm.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{perm.label}</span>
                      {!isCustomMode && isDefault && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? "Saving…" : "Save permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { email: myEmail } = useRole();

  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const [permDialogUser, setPermDialogUser] = useState<AppUser | null>(null);
  const [savingPerms, setSavingPerms] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  function handleRoleChange(user: AppUser, role: string) {
    updateRole.mutate(
      {
        username: user.username,
        data: { role: role === "pending" ? null : (role as "admin" | "salesperson" | "cashier") },
      },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Role updated" });
        },
        onError: () => {
          toast({ title: "Failed to update role", variant: "destructive" });
        },
      }
    );
  }

  function handleSavePermissions(username: string, permissions: Permission[] | null) {
    setSavingPerms(true);
    const user = users?.find((u) => u.username === username);
    if (!user) return;

    updateRole.mutate(
      {
        username,
        data: {
          role: user.role as "admin" | "salesperson" | "cashier" | null,
          permissions,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setSavingPerms(false);
          setPermDialogUser(null);
          toast({ title: permissions === null ? "Reset to role defaults" : "Custom permissions saved" });
        },
        onError: () => {
          setSavingPerms(false);
          toast({ title: "Failed to save permissions", variant: "destructive" });
        },
      }
    );
  }

  function handleDelete(user: AppUser) {
    deleteUser.mutate(
      { username: user.username },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "User removed" });
        },
        onError: () => {
          toast({ title: "Failed to remove user", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UsersIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts, roles, and per-user access permissions
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const custom = isCustom(user);
                const effectivePerms: Permission[] =
                  user.permissions && user.permissions.length > 0
                    ? (user.permissions as Permission[])
                    : getDefaultsForRole(user.role);

                return (
                  <TableRow key={user.username} data-testid={`row-user-${user.username}`}>
                    <TableCell className="font-medium">
                      {user.name || "—"}
                      {user.email === myEmail && (
                        <Badge variant="secondary" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                    <TableCell>
                      {user.role ? (
                        <Select
                          value={user.role}
                          onValueChange={(val) => handleRoleChange(user, val)}
                        >
                          <SelectTrigger className="w-36" data-testid={`select-role-${user.username}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="salesperson">Salesperson</SelectItem>
                            <SelectItem value="cashier">Cashier</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select onValueChange={(val) => handleRoleChange(user, val)}>
                          <SelectTrigger className="w-36" data-testid={`select-role-${user.username}`}>
                            <SelectValue placeholder="Assign role…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="salesperson">Salesperson</SelectItem>
                            <SelectItem value="cashier">Cashier</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {effectivePerms.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          effectivePerms.map((p) => (
                            <Badge
                              key={p}
                              variant="secondary"
                              className="text-[11px] px-1.5 py-0 capitalize"
                            >
                              {p}
                            </Badge>
                          ))
                        )}
                        {custom && (
                          <Badge className="text-[11px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                            custom
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit permissions"
                          onClick={() => setPermDialogUser(user)}
                          data-testid={`button-perms-${user.username}`}
                        >
                          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          disabled={user.email === myEmail}
                          data-testid={`button-delete-${user.clerkUserId}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          New users appear here automatically when they first sign in. Assign a role to grant
          default access, then use <SlidersHorizontal className="inline h-3.5 w-3.5 mx-0.5 align-[-2px]" /> to
          fine-tune which tabs each person can see.
        </p>
      </div>

      {permDialogUser && (
        <PermissionDialog
          user={permDialogUser}
          open={!!permDialogUser}
          onClose={() => setPermDialogUser(null)}
          onSave={handleSavePermissions}
          isSaving={savingPerms}
        />
      )}
    </div>
  );
}
