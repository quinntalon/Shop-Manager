import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ── Types ──────────────────────────────────────────────────────────────────

export interface StockTransferItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  notes: string | null;
  transferredBy: string | null;
  createdAt: string;
}

export interface CreateStockTransferInput {
  productId: number;
  quantity: number;
  notes?: string;
}

// ── Query keys ─────────────────────────────────────────────────────────────

export const STOCK_TRANSFERS_KEY = ["stock-transfers"] as const;

export function getListStockTransfersQueryKey(productId?: number) {
  return productId != null
    ? [...STOCK_TRANSFERS_KEY, { productId }]
    : STOCK_TRANSFERS_KEY;
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

export async function listStockTransfers(productId?: number): Promise<StockTransferItem[]> {
  const url = productId != null
    ? `/api/stock-transfers?productId=${productId}`
    : `/api/stock-transfers`;
  return customFetch<StockTransferItem[]>(url);
}

export async function createStockTransfer(data: CreateStockTransferInput): Promise<StockTransferItem> {
  return customFetch<StockTransferItem>("/api/stock-transfers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useListStockTransfers(
  productId?: number,
  options?: { query?: UseQueryOptions<StockTransferItem[], Error> },
) {
  return useQuery<StockTransferItem[], Error>({
    queryKey: getListStockTransfersQueryKey(productId),
    queryFn: () => listStockTransfers(productId),
    ...options?.query,
  });
}

export function useCreateStockTransfer(options?: {
  mutation?: UseMutationOptions<StockTransferItem, Error, CreateStockTransferInput>;
}) {
  return useMutation<StockTransferItem, Error, CreateStockTransferInput>({
    mutationFn: (data) => createStockTransfer(data),
    ...options?.mutation,
  });
}
