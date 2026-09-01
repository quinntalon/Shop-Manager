import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { getListProductsQueryKey, getGetProductQueryKey } from "./generated/api";
import type { Product } from "./generated/api.schemas";

// ── Extended type ──────────────────────────────────────────────────────────
// The generated Product type doesn't include storefrontActive yet (it's added
// via a DB migration). We extend it here so the rest of the app can use it
// with full type safety without touching any generated files.

export interface ProductWithStorefront extends Product {
  storefrontActive: boolean;
  warehouseStock: number;
  discountPercent: number;
  /** Background-removed version of the photo (transparent PNG). Equals photoUrl when bg removal is unavailable. */
  originalPhotoUrl: string | null;
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

export async function setStorefrontStatus(
  id: number,
  active: boolean,
): Promise<ProductWithStorefront> {
  return customFetch<ProductWithStorefront>(`/api/products/${id}/storefront-status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function bulkSetStorefrontStatus(
  ids: number[],
  active: boolean,
): Promise<{ updated: number }> {
  return customFetch<{ updated: number }>("/api/products/bulk-storefront-status", {
    method: "PATCH",
    body: JSON.stringify({ ids, active }),
  });
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useSetStorefrontStatus(options?: {
  mutation?: UseMutationOptions<
    ProductWithStorefront,
    Error,
    { id: number; active: boolean }
  >;
}) {
  const qc = useQueryClient();
  return useMutation<ProductWithStorefront, Error, { id: number; active: boolean }>({
    mutationFn: ({ id, active }) => setStorefrontStatus(id, active),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetProductQueryKey(data.id) });
    },
    ...options?.mutation,
  });
}

export function useBulkSetStorefrontStatus(options?: {
  mutation?: UseMutationOptions<
    { updated: number },
    Error,
    { ids: number[]; active: boolean }
  >;
}) {
  const qc = useQueryClient();
  return useMutation<{ updated: number }, Error, { ids: number[]; active: boolean }>({
    mutationFn: ({ ids, active }) => bulkSetStorefrontStatus(ids, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
    },
    ...options?.mutation,
  });
}
