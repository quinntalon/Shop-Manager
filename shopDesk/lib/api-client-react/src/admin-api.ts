import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ── Add warehouse stock ─────────────────────────────────────────────────────

export interface AddWarehouseStockInput {
  productId: number;
  quantity: number;
}

export async function addWarehouseStock({ productId, quantity }: AddWarehouseStockInput): Promise<void> {
  await customFetch<void>(`/api/products/${productId}/add-warehouse-stock`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

export function useAddWarehouseStock(options?: {
  mutation?: UseMutationOptions<void, Error, AddWarehouseStockInput>;
}) {
  return useMutation<void, Error, AddWarehouseStockInput>({
    mutationFn: addWarehouseStock,
    ...options?.mutation,
  });
}

// ── Bulk discount ───────────────────────────────────────────────────────────

export interface BulkDiscountInput {
  discountPercent: number;
  /** If omitted, applies to ALL products */
  productIds?: number[];
}

export async function bulkDiscount(data: BulkDiscountInput): Promise<void> {
  await customFetch<void>("/api/products/bulk-discount", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function useBulkDiscount(options?: {
  mutation?: UseMutationOptions<void, Error, BulkDiscountInput>;
}) {
  return useMutation<void, Error, BulkDiscountInput>({
    mutationFn: bulkDiscount,
    ...options?.mutation,
  });
}
