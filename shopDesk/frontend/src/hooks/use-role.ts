import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authQueryKey, getCurrentUser, logout, type LocalUser } from "@/lib/auth";

export type Permission = "dashboard" | "inventory" | "sales" | "categories" | "users" | "settings" | "customers" | "reports";

export function useRole() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<LocalUser | null>({
    queryKey: authQueryKey,
    queryFn: getCurrentUser,
    retry: false,
  });

  const role = data?.role ?? null;
  const permissions = (data?.permissions ?? []) as Permission[];

  return {
    user: data,
    role,
    permissions,
    name: data?.name ?? "",
    email: data?.email ?? "",
    username: data?.username ?? "",
    isLoading,
    isError: isError && !data,
    isAuthenticated: !!data,
    isPending: !isLoading && !!data && data.status === "pending",
    isRejected: !isLoading && !!data && data.status === "rejected",
    can: (permission: Permission) => permissions.includes(permission),
    signOut: async () => {
      await logout();
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      queryClient.setQueryData(authQueryKey, null);
    },
  };
}
