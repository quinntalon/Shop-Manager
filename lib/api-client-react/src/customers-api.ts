import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { Customer, CustomerPurchase } from "./generated/api.schemas";

export type ListCustomersParams = {
  search?: string;
  limit?: number;
  offset?: number;
};

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString() ? `?${qs}` : "";
}

// ── List customers ────────────────────────────────────────────────────────────

export const getListCustomersQueryKey = (params?: ListCustomersParams) =>
  ["listCustomers", params] as const;

export const listCustomers = (params?: ListCustomersParams): Promise<Customer[]> =>
  customFetch<Customer[]>(
    `/api/customers${buildQs({ search: params?.search, limit: params?.limit, offset: params?.offset })}`,
  );

export function useListCustomers(
  params?: ListCustomersParams,
  options?: { query?: UseQueryOptions<Customer[], Error> },
) {
  return useQuery<Customer[], Error>({
    queryKey: getListCustomersQueryKey(params),
    queryFn: () => listCustomers(params),
    ...options?.query,
  });
}

// ── Customer purchase history ─────────────────────────────────────────────────

export const getCustomerPurchasesQueryKey = (name: string) =>
  ["customerPurchases", name] as const;

export const getCustomerPurchases = (name: string): Promise<CustomerPurchase[]> =>
  customFetch<CustomerPurchase[]>(`/api/customers/${encodeURIComponent(name)}/purchases`);

export function useGetCustomerPurchases(
  name: string,
  options?: { query?: UseQueryOptions<CustomerPurchase[], Error> },
) {
  return useQuery<CustomerPurchase[], Error>({
    queryKey: getCustomerPurchasesQueryKey(name),
    queryFn: () => getCustomerPurchases(name),
    enabled: !!name,
    ...options?.query,
  });
}
