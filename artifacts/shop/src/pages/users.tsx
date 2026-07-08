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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users as UsersIcon, Trash2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/use-role";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  salesperson: "Salesperson",
  cashier: "Cashier",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { email: myEmail } = useRole();

  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  function handleRoleChange(user: AppUser, role: string) {
    updateRole.mutate(
      {
        clerkUserId: user.clerkUserId,
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

  function handleDelete(user: AppUser) {
    deleteUser.mutate(
      { clerkUserId: user.clerkUserId },
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
            Manage user accounts and role-based access
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
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.clerkUserId} data-testid={`row-user-${user.clerkUserId}`}>
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
                        <SelectTrigger className="w-40" data-testid={`select-role-${user.clerkUserId}`}>
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
                        <SelectTrigger className="w-40" data-testid={`select-role-${user.clerkUserId}`}>
                          <SelectValue placeholder="Pending – assign role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="salesperson">Salesperson</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user)}
                      disabled={user.email === myEmail}
                      data-testid={`button-delete-${user.clerkUserId}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          New users appear here automatically the first time they sign in. Assign them a role
          (Admin, Salesperson, or Cashier) to grant access — until then they'll see a
          "waiting for access" screen.
        </p>
      </div>
    </div>
  );
}
