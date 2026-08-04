import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { LoyaltyAccount, LoyaltyTransaction, LoyaltyAdjustInput } from "./generated/api.schemas";

// ── Query keys ────────────────────────────────────────────────────────────────

export const getLoyaltyAccountQueryKey = (phone: string) =>
  ["loyaltyAccount", phone] as const;

export const getLoyaltySaleQueryKey = (saleId: number) =>
  ["loyaltySale", saleId] as const;

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export const fetchLoyaltyAccount = (phone: string): Promise<LoyaltyAccount> =>
  customFetch<LoyaltyAccount>(`/api/loyalty/${encodeURIComponent(phone)}`);

export const fetchLoyaltySale = (saleId: number): Promise<LoyaltyTransaction[]> =>
  customFetch<LoyaltyTransaction[]>(`/api/loyalty/sale/${saleId}`);

export const adjustLoyaltyPoints = (data: LoyaltyAdjustInput): Promise<{ transaction: LoyaltyTransaction; balance: number }> =>
  customFetch<{ transaction: LoyaltyTransaction; balance: number }>("/api/loyalty/adjust", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useGetLoyaltyAccount(
  phone: string,
  options?: { query?: Omit<UseQueryOptions<LoyaltyAccount, Error>, 'queryKey' | 'queryFn'> },
) {
  return useQuery<LoyaltyAccount, Error>({
    queryKey: getLoyaltyAccountQueryKey(phone),
    queryFn: () => fetchLoyaltyAccount(phone),
    enabled: !!phone,
    ...options?.query,
  });
}

export function useGetLoyaltySale(
  saleId: number,
  options?: { query?: Omit<UseQueryOptions<LoyaltyTransaction[], Error>, 'queryKey' | 'queryFn'> },
) {
  return useQuery<LoyaltyTransaction[], Error>({
    queryKey: getLoyaltySaleQueryKey(saleId),
    queryFn: () => fetchLoyaltySale(saleId),
    enabled: !!saleId,
    ...options?.query,
  });
}

export function useAdjustLoyaltyPoints(options?: {
  mutation?: UseMutationOptions<{ transaction: LoyaltyTransaction; balance: number }, Error, LoyaltyAdjustInput>;
}) {
  return useMutation<{ transaction: LoyaltyTransaction; balance: number }, Error, LoyaltyAdjustInput>({
    mutationFn: adjustLoyaltyPoints,
    ...options?.mutation,
  });
}
