import { useGetMyRole } from "@workspace/api-client-react";

export type Permission = "dashboard" | "inventory" | "sales" | "categories" | "users" | "settings" | "customers" | "reports";

export function useRole() {
  const { data, isLoading, isError } = useGetMyRole();

  const role = data?.role ?? null;
  const permissions = (data?.permissions ?? []) as Permission[];

  return {
    role,
    permissions,
    name: data?.name ?? "",
    email: data?.email ?? "",
    isLoading,
    isError,
    isPending: !isLoading && !isError && !role,
    can: (permission: Permission) => permissions.includes(permission),
  };
}
